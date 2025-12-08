-- Push Notification Supporting Tables
-- Run this migration in Supabase SQL Editor

-- 1. Notification Settings Table (User Preferences)
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Push preferences
  enable_push_notifications BOOLEAN DEFAULT true,
  enable_toast_notifications BOOLEAN DEFAULT true,
  enable_sound_notifications BOOLEAN DEFAULT true,
  
  -- Per-type push preferences
  enable_push_for_type JSONB DEFAULT '["ticket_assigned", "ticket_updated", "comment_added", "mention"]'::jsonb,
  
  -- Mute settings
  is_muted BOOLEAN DEFAULT false,
  mute_duration_ms INTEGER DEFAULT 0, -- 0 = never, 300000 = 5min, 1800000 = 30min, etc.
  muted_until TIMESTAMP WITH TIME ZONE,
  
  -- Device preferences
  preferred_device_type TEXT, -- desktop, mobile, all
  receive_on_all_devices BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Push Send Logs (For Debugging & Analytics)
CREATE TABLE IF NOT EXISTS push_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  failed_subscriptions JSONB, -- Array of failed subscription IDs with reasons
  
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Push Delivery Analytics (Track success rates)
CREATE TABLE IF NOT EXISTS push_delivery_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Stats
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_dismissed INTEGER DEFAULT 0,
  
  -- Dates
  date_tracked DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, company_id, date_tracked)
);

-- 4. Push Click Tracking (Analytics)
CREATE TABLE IF NOT EXISTS push_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  
  device_type TEXT, -- desktop, mobile, tablet
  browser_name TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  navigation_url TEXT
);

-- Enable RLS on all tables
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_delivery_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own settings"
ON notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON notification_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for push_send_logs (Service role only for writing)
CREATE POLICY "Service role can insert logs"
ON push_send_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own logs"
ON push_send_logs FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for push_delivery_stats
CREATE POLICY "Service role can manage stats"
ON push_delivery_stats FOR ALL
USING (true);

-- RLS Policies for push_clicks
CREATE POLICY "Service role can insert clicks"
ON push_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own clicks"
ON push_clicks FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_push_send_logs_user_id ON push_send_logs(user_id);
CREATE INDEX idx_push_send_logs_notification_id ON push_send_logs(notification_id);
CREATE INDEX idx_push_send_logs_sent_at ON push_send_logs(sent_at);
CREATE INDEX idx_push_delivery_stats_user_id ON push_delivery_stats(user_id);
CREATE INDEX idx_push_delivery_stats_date ON push_delivery_stats(date_tracked);
CREATE INDEX idx_push_clicks_user_id ON push_clicks(user_id);
CREATE INDEX idx_push_clicks_clicked_at ON push_clicks(clicked_at);

-- Create a trigger to update notification_settings.updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_settings_timestamp
BEFORE UPDATE ON notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_notification_settings_timestamp();

-- Create a trigger to update push_delivery_stats when push_send_logs is inserted
CREATE OR REPLACE FUNCTION update_push_delivery_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO push_delivery_stats (user_id, company_id, date_tracked, total_sent, total_delivered, total_failed)
  VALUES (
    NEW.user_id,
    NEW.company_id,
    CURRENT_DATE,
    NEW.total_sent,
    NEW.total_sent - NEW.total_failed,
    NEW.total_failed
  )
  ON CONFLICT (user_id, company_id, date_tracked)
  DO UPDATE SET
    total_sent = total_sent + NEW.total_sent,
    total_delivered = total_delivered + (NEW.total_sent - NEW.total_failed),
    total_failed = total_failed + NEW.total_failed,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_stats_update
AFTER INSERT ON push_send_logs
FOR EACH ROW
EXECUTE FUNCTION update_push_delivery_stats();

-- Create a trigger to track push clicks
CREATE OR REPLACE FUNCTION track_push_click()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE push_delivery_stats
  SET total_clicked = total_clicked + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND company_id = NEW.company_id
    AND date_tracked = CURRENT_DATE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_click_tracking
AFTER INSERT ON push_clicks
FOR EACH ROW
EXECUTE FUNCTION track_push_click();

-- Helper function to initialize notification settings for new users
CREATE OR REPLACE FUNCTION init_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the user's company_id (assuming it's in a user_profiles table)
  INSERT INTO notification_settings (user_id, company_id)
  SELECT NEW.id, user_profiles.company_id
  FROM user_profiles
  WHERE user_profiles.user_id = NEW.id
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Create this trigger if you have auth.users table accessible
-- CREATE TRIGGER new_user_notification_settings
-- AFTER INSERT ON auth.users
-- FOR EACH ROW
-- EXECUTE FUNCTION init_notification_settings();

-- Cleanup trigger: Archive old push_send_logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_push_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM push_send_logs
  WHERE sent_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM push_clicks
  WHERE clicked_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this via pg_cron if available:
-- SELECT cron.schedule('cleanup_old_push_logs', '0 2 * * *', 'SELECT cleanup_old_push_logs()');

-- Create views for easy analytics
CREATE OR REPLACE VIEW push_notification_stats AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT psl.id) as total_notifications_sent,
  COUNT(DISTINCT CASE WHEN psl.total_failed > 0 THEN psl.id END) as notifications_with_failures,
  COUNT(DISTINCT pc.id) as total_clicks,
  ROUND(100.0 * COUNT(DISTINCT pc.id) / NULLIF(COUNT(DISTINCT psl.id), 0), 2) as click_through_rate
FROM auth.users u
LEFT JOIN push_send_logs psl ON u.id = psl.user_id
LEFT JOIN push_clicks pc ON u.id = pc.user_id
GROUP BY u.id;

-- View for daily push statistics
CREATE OR REPLACE VIEW daily_push_stats AS
SELECT
  date_tracked,
  COUNT(DISTINCT user_id) as active_users,
  SUM(total_sent) as total_notifications_sent,
  SUM(total_delivered) as total_delivered,
  SUM(total_failed) as total_failed,
  SUM(total_clicked) as total_clicked,
  ROUND(100.0 * SUM(total_clicked) / NULLIF(SUM(total_sent), 0), 2) as click_through_rate
FROM push_delivery_stats
GROUP BY date_tracked
ORDER BY date_tracked DESC;
