-- ============================================================================
-- WORKING AREA FEATURE - COMPLETE SQL SCHEMA
-- Production-Ready Implementation for Supabase
-- ============================================================================

-- ============================================================================
-- 1. WORKING_AREA_FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS working_area_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES working_area_folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  share_type VARCHAR(50) DEFAULT 'private' CHECK (share_type IN ('private', 'company', 'team', 'specific_users')),
  color VARCHAR(7),
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT folder_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT unique_folder_name_per_parent UNIQUE (company_id, owner_id, parent_folder_id, name) WHERE deleted_at IS NULL
);

-- Indexes for working_area_folders
CREATE INDEX idx_folders_company_owner ON working_area_folders(company_id, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_parent_id ON working_area_folders(parent_folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_is_shared ON working_area_folders(is_shared, share_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_folders_deleted_at ON working_area_folders(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_folders_created_at ON working_area_folders(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. WORKING_AREA_FILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS working_area_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES working_area_folders(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_extension VARCHAR(20),
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  checksum VARCHAR(64),
  thumbnail_path TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT file_size_valid CHECK (size_bytes > 0 AND size_bytes <= 104857600), -- 100MB max
  CONSTRAINT unique_file_per_folder UNIQUE (folder_id, name, version_number) WHERE deleted_at IS NULL
);

-- Indexes for working_area_files
CREATE INDEX idx_files_company_folder ON working_area_files(company_id, folder_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_owner_id ON working_area_files(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_file_type ON working_area_files(file_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_is_current ON working_area_files(is_current_version) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_checksum ON working_area_files(checksum) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_deleted_at ON working_area_files(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_files_created_at ON working_area_files(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_name_search ON working_area_files USING GIN(to_tsvector('english', name)) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. WORKING_AREA_ACCESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS working_area_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES working_area_folders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) DEFAULT 'view' CHECK (permission_level IN ('view', 'download', 'upload', 'edit', 'admin')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT user_or_team CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)),
  CONSTRAINT unique_user_access UNIQUE (folder_id, user_id) WHERE user_id IS NOT NULL,
  CONSTRAINT unique_team_access UNIQUE (folder_id, team_id) WHERE team_id IS NOT NULL
);

-- Indexes for working_area_access
CREATE INDEX idx_access_folder_user ON working_area_access(folder_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_access_folder_team ON working_area_access(folder_id, team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_access_expires_at ON working_area_access(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_access_created_at ON working_area_access(created_at DESC);

-- ============================================================================
-- 4. WORKING_AREA_ACTIVITY_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS working_area_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('folder', 'file')),
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'share', 'download', 'upload', 'restore')),
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions for activity log (monthly partitions)
CREATE TABLE IF NOT EXISTS working_area_activity_log_2025_01 PARTITION OF working_area_activity_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS working_area_activity_log_2025_02 PARTITION OF working_area_activity_log
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Create indexes for activity log partitions
CREATE INDEX idx_activity_company_date ON working_area_activity_log(company_id, created_at DESC);
CREATE INDEX idx_activity_user_date ON working_area_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_entity ON working_area_activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_action ON working_area_activity_log(action);

-- ============================================================================
-- 5. WORKING_AREA_TRASH TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS working_area_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('folder', 'file')),
  entity_id UUID NOT NULL,
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  metadata JSONB NOT NULL,

  -- Constraints
  CONSTRAINT unique_entity_in_trash UNIQUE (entity_type, entity_id)
);

-- Indexes for working_area_trash
CREATE INDEX idx_trash_auto_delete ON working_area_trash(auto_delete_at) WHERE auto_delete_at IS NOT NULL;
CREATE INDEX idx_trash_user_date ON working_area_trash(deleted_by, deleted_at DESC);
CREATE INDEX idx_trash_entity ON working_area_trash(entity_type, entity_id);
CREATE INDEX idx_trash_company ON working_area_trash(company_id);

-- ============================================================================
-- 6. WORKING_AREA_FAVORITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS working_area_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('folder', 'file')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_favorite UNIQUE (user_id, entity_type, entity_id)
);

-- Indexes for working_area_favorites
CREATE INDEX idx_favorites_user ON working_area_favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_entity ON working_area_favorites(entity_type, entity_id);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE working_area_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_area_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_area_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_area_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_area_trash ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_area_favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FOLDERS RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own folders
CREATE POLICY "users_view_own_folders" ON working_area_folders
  FOR SELECT
  USING (
    owner_id = auth.uid()
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Policy: Users can view shared folders accessible to their company
CREATE POLICY "users_view_company_shared_folders" ON working_area_folders
  FOR SELECT
  USING (
    is_shared = true
    AND share_type = 'company'
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Policy: Users can view folders shared with their teams
CREATE POLICY "users_view_team_shared_folders" ON working_area_folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM working_area_access waa
      JOIN team_members tm ON tm.team_id = waa.team_id
      WHERE waa.folder_id = working_area_folders.id
      AND tm.user_id = auth.uid()
      AND (waa.expires_at IS NULL OR waa.expires_at > now())
    )
  );

-- Policy: Users can view folders shared specifically with them
CREATE POLICY "users_view_specific_shared_folders" ON working_area_folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM working_area_access waa
      WHERE waa.folder_id = working_area_folders.id
      AND waa.user_id = auth.uid()
      AND (waa.expires_at IS NULL OR waa.expires_at > now())
    )
  );

-- Policy: Users can create folders in their workspace
CREATE POLICY "users_create_folders" ON working_area_folders
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Policy: Users can update their own folders
CREATE POLICY "users_update_own_folders" ON working_area_folders
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can delete their own folders
CREATE POLICY "users_delete_own_folders" ON working_area_folders
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- FILES RLS POLICIES
-- ============================================================================

-- Policy: Users can view files in folders they own
CREATE POLICY "users_view_own_files" ON working_area_files
  FOR SELECT
  USING (
    owner_id = auth.uid()
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Policy: Users can view files in folders accessible to them
CREATE POLICY "users_view_accessible_files" ON working_area_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE waf.id = working_area_files.folder_id
      AND (
        waf.owner_id = auth.uid()
        OR (waf.is_shared = true AND waf.share_type = 'company')
        OR EXISTS (
          SELECT 1 FROM working_area_access waa
          JOIN team_members tm ON tm.team_id = waa.team_id
          WHERE waa.folder_id = waf.id
          AND tm.user_id = auth.uid()
          AND (waa.expires_at IS NULL OR waa.expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM working_area_access waa
          WHERE waa.folder_id = waf.id
          AND waa.user_id = auth.uid()
          AND (waa.expires_at IS NULL OR waa.expires_at > now())
        )
      )
    )
  );

-- Policy: Users can upload files to their folders
CREATE POLICY "users_upload_files" ON working_area_files
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Policy: Users can update their own files
CREATE POLICY "users_update_own_files" ON working_area_files
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Policy: Users can delete their own files
CREATE POLICY "users_delete_own_files" ON working_area_files
  FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================================================
-- ACCESS RLS POLICIES
-- ============================================================================

-- Policy: Users can view access permissions for folders they own
CREATE POLICY "users_view_own_folder_access" ON working_area_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE waf.id = working_area_access.folder_id
      AND waf.owner_id = auth.uid()
    )
  );

-- Policy: Users can manage access for folders they own
CREATE POLICY "users_manage_own_folder_access" ON working_area_access
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE waf.id = working_area_access.folder_id
      AND waf.owner_id = auth.uid()
    )
    AND granted_by = auth.uid()
  );

-- Policy: Users can update access permissions for folders they own
CREATE POLICY "users_update_folder_access" ON working_area_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE waf.id = working_area_access.folder_id
      AND waf.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE waf.id = working_area_access.folder_id
      AND waf.owner_id = auth.uid()
    )
  );

-- Policy: Users can delete access permissions for folders they own
CREATE POLICY "users_delete_folder_access" ON working_area_access
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE waf.id = working_area_access.folder_id
      AND waf.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- ACTIVITY LOG RLS POLICIES
-- ============================================================================

-- Policy: Users can view activity logs for their own files and folders
CREATE POLICY "users_view_own_activity" ON working_area_activity_log
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE (waf.id = working_area_activity_log.entity_id AND working_area_activity_log.entity_type = 'folder')
      AND waf.owner_id = auth.uid()
    )
  );

-- Policy: System can insert activity logs
CREATE POLICY "system_insert_activity" ON working_area_activity_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- TRASH RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own trash items
CREATE POLICY "users_view_own_trash" ON working_area_trash
  FOR SELECT
  USING (
    deleted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM working_area_folders waf
      WHERE (waf.id = working_area_trash.entity_id AND working_area_trash.entity_type = 'folder')
      AND waf.owner_id = auth.uid()
    )
  );

-- Policy: System can insert items into trash
CREATE POLICY "system_insert_trash" ON working_area_trash
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can delete (restore) their own trash items
CREATE POLICY "users_restore_trash" ON working_area_trash
  FOR DELETE
  USING (deleted_by = auth.uid());

-- ============================================================================
-- FAVORITES RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own favorites
CREATE POLICY "users_view_own_favorites" ON working_area_favorites
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can add favorites
CREATE POLICY "users_add_favorites" ON working_area_favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can remove their own favorites
CREATE POLICY "users_remove_favorites" ON working_area_favorites
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Log activity
CREATE OR REPLACE FUNCTION log_working_area_activity(
  p_company_id UUID,
  p_user_id UUID,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_action VARCHAR,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  v_id := gen_random_uuid();
  
  INSERT INTO working_area_activity_log (
    id, company_id, user_id, entity_type, entity_id, action, metadata, created_at
  ) VALUES (
    v_id, p_company_id, p_user_id, p_entity_type, p_entity_id, p_action, p_metadata, now()
  );
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Move to trash
CREATE OR REPLACE FUNCTION move_to_trash(
  p_company_id UUID,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_deleted_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_metadata JSONB;
  v_id UUID;
BEGIN
  -- Get metadata based on entity type
  IF p_entity_type = 'folder' THEN
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'owner_id', owner_id,
      'parent_folder_id', parent_folder_id,
      'is_shared', is_shared,
      'created_at', created_at
    ) INTO v_metadata
    FROM working_area_folders WHERE id = p_entity_id;
  ELSIF p_entity_type = 'file' THEN
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'original_name', original_name,
      'folder_id', folder_id,
      'owner_id', owner_id,
      'file_type', file_type,
      'size_bytes', size_bytes,
      'storage_path', storage_path,
      'created_at', created_at
    ) INTO v_metadata
    FROM working_area_files WHERE id = p_entity_id;
  END IF;

  -- Insert into trash
  v_id := gen_random_uuid();
  INSERT INTO working_area_trash (
    id, company_id, entity_type, entity_id, deleted_by, metadata, deleted_at, auto_delete_at
  ) VALUES (
    v_id, p_company_id, p_entity_type, p_entity_id, p_deleted_by, v_metadata, now(), now() + INTERVAL '30 days'
  );

  -- Log activity
  PERFORM log_working_area_activity(p_company_id, p_deleted_by, p_entity_type, p_entity_id, 'delete', v_metadata);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate folder size
CREATE OR REPLACE FUNCTION calculate_folder_size(p_folder_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_total_size BIGINT := 0;
BEGIN
  SELECT COALESCE(SUM(size_bytes), 0)
  INTO v_total_size
  FROM working_area_files
  WHERE folder_id = p_folder_id
  AND is_current_version = true
  AND deleted_at IS NULL;

  RETURN v_total_size;
END;
$$ LANGUAGE plpgsql;

-- Function: Get folder tree with counts
CREATE OR REPLACE FUNCTION get_folder_tree(p_folder_id UUID)
RETURNS TABLE(
  folder_id UUID,
  name VARCHAR,
  file_count BIGINT,
  subfolder_count BIGINT,
  total_size BIGINT,
  depth INTEGER
) AS $$
  WITH RECURSIVE folder_tree AS (
    -- Base case: start folder
    SELECT 
      id,
      name,
      (SELECT COUNT(*) FROM working_area_files WHERE folder_id = working_area_folders.id AND deleted_at IS NULL) as file_count,
      (SELECT COUNT(*) FROM working_area_folders WHERE parent_folder_id = working_area_folders.id AND deleted_at IS NULL) as subfolder_count,
      calculate_folder_size(id) as total_size,
      1 as depth
    FROM working_area_folders
    WHERE id = p_folder_id
    AND deleted_at IS NULL
    
    UNION ALL
    
    -- Recursive case: subfolders
    SELECT 
      waf.id,
      waf.name,
      (SELECT COUNT(*) FROM working_area_files WHERE folder_id = waf.id AND deleted_at IS NULL),
      (SELECT COUNT(*) FROM working_area_folders WHERE parent_folder_id = waf.id AND deleted_at IS NULL),
      calculate_folder_size(waf.id),
      ft.depth + 1
    FROM working_area_folders waf
    JOIN folder_tree ft ON ft.folder_id = waf.parent_folder_id
    WHERE waf.deleted_at IS NULL
    AND ft.depth < 20 -- Prevent infinite recursion
  )
  SELECT * FROM folder_tree;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- GRANTS (Update based on your auth setup)
-- ============================================================================

-- Allow authenticated users to access the tables (RLS will handle permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON working_area_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON working_area_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON working_area_access TO authenticated;
GRANT SELECT ON working_area_activity_log TO authenticated;
GRANT SELECT, DELETE ON working_area_trash TO authenticated;
GRANT SELECT, INSERT, DELETE ON working_area_favorites TO authenticated;

-- Allow service role for admin operations (server-side functions)
GRANT ALL ON working_area_folders TO service_role;
GRANT ALL ON working_area_files TO service_role;
GRANT ALL ON working_area_access TO service_role;
GRANT ALL ON working_area_activity_log TO service_role;
GRANT ALL ON working_area_trash TO service_role;
GRANT ALL ON working_area_favorites TO service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE working_area_folders IS 'Personal and shared folder hierarchy for file organization';
COMMENT ON TABLE working_area_files IS 'File metadata with version control and duplicate detection via checksum';
COMMENT ON TABLE working_area_access IS 'Fine-grained access control for folders (user and team-based)';
COMMENT ON TABLE working_area_activity_log IS 'Audit trail partitioned by month for compliance and troubleshooting';
COMMENT ON TABLE working_area_trash IS 'Soft-deleted items with 30-day retention and automatic cleanup';
COMMENT ON TABLE working_area_favorites IS 'User bookmarks for quick access to frequently used folders/files';

-- ============================================================================
-- END OF SQL SCHEMA
-- ============================================================================
