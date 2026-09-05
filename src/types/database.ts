/* Generated Supabase contract for the live Desk-Support public schema.
 * Refresh from Supabase after every schema migration; do not hand-maintain domain models here. */
export type Json = string | number | boolean | null | { [key:string]: Json | undefined } | Json[]
type RecordTable = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      profiles: { Row:{id:string;username:string;full_name:string;avatar_path:string|null;phone:string|null;is_online:boolean;last_seen_at:string|null;created_at:string;updated_at:string}; Insert:{id:string;username:string;full_name:string;avatar_path?:string|null;phone?:string|null;is_online?:boolean;last_seen_at?:string|null;created_at?:string;updated_at?:string}; Update:{id?:string;username?:string;full_name?:string;avatar_path?:string|null;phone?:string|null;is_online?:boolean;last_seen_at?:string|null;created_at?:string;updated_at?:string}; Relationships:[] }
      companies: { Row:{id:string;name:string;email:string|null;phone:string|null;address:string|null;website:string|null;logo_url:string|null;status:'active'|'suspended'|'archived';created_at:string;updated_at:string}; Insert:{id?:string;name:string;email?:string|null;phone?:string|null;address?:string|null;website?:string|null;logo_url?:string|null;status?:'active'|'suspended'|'archived';created_at?:string;updated_at?:string}; Update:{id?:string;name?:string;email?:string|null;phone?:string|null;address?:string|null;website?:string|null;logo_url?:string|null;status?:'active'|'suspended'|'archived';created_at?:string;updated_at?:string}; Relationships:[] }
      company_memberships: { Row:{id:string;company_id:string;user_id:string;role:'admin'|'hr'|'manager'|'employee'|'contractor'|'viewer';department_id:string|null;is_active:boolean;joined_at:string;created_at:string;updated_at:string}; Insert:{id?:string;company_id:string;user_id:string;role?:'admin'|'hr'|'manager'|'employee'|'contractor'|'viewer';department_id?:string|null;is_active?:boolean;joined_at?:string;created_at?:string;updated_at?:string}; Update:{id?:string;company_id?:string;user_id?:string;role?:'admin'|'hr'|'manager'|'employee'|'contractor'|'viewer';department_id?:string|null;is_active?:boolean;joined_at?:string;created_at?:string;updated_at?:string}; Relationships:[] }
      departments: { Row:{id:string;company_id:string;name:string;description:string|null;manager_id:string|null;created_at:string;updated_at:string}; Insert:{id?:string;company_id:string;name:string;description?:string|null;manager_id?:string|null;created_at?:string;updated_at?:string}; Update:{id?:string;company_id?:string;name?:string;description?:string|null;manager_id?:string|null;created_at?:string;updated_at?:string}; Relationships:[] }
      teams: { Row:{id:string;company_id:string;name:string;description:string|null;department_id:string|null;team_lead_id:string|null;created_by:string|null;avatar_color:string|null;created_at:string;updated_at:string}; Insert:{id?:string;company_id:string;name:string;description?:string|null;department_id?:string|null;team_lead_id?:string|null;created_by?:string|null;avatar_color?:string|null;created_at?:string;updated_at?:string}; Update:{id?:string;company_id?:string;name?:string;description?:string|null;department_id?:string|null;team_lead_id?:string|null;created_by?:string|null;avatar_color?:string|null;created_at?:string;updated_at?:string}; Relationships:[] }
      company_settings: { Row:{company_id:string;default_theme:string;primary_color:string|null;secondary_color:string|null;accent_color:string|null;currency_code:string;date_format:string;time_format:string;timezone:string;enable_asset_qr_codes:boolean;enable_email_notifications:boolean;enable_push_notifications:boolean;enable_ticket_attachments:boolean;created_at:string;updated_at:string}; Insert:Record<string,unknown>; Update:Record<string,unknown>; Relationships:[] }
      conversations: { Row:{id:string;company_id:string;kind:'direct'|'group'|'team'|'ticket';title:string|null;avatar_path:string|null;created_by:string;metadata:Json;created_at:string;updated_at:string}; Insert:{id?:string;company_id:string;kind?:'direct'|'group'|'team'|'ticket';title?:string|null;avatar_path?:string|null;created_by:string;metadata?:Json;created_at?:string;updated_at?:string}; Update:{id?:string;company_id?:string;kind?:'direct'|'group'|'team'|'ticket';title?:string|null;avatar_path?:string|null;created_by?:string;metadata?:Json;created_at?:string;updated_at?:string}; Relationships:[] }
      conversation_members: { Row:{conversation_id:string;user_id:string;role:'owner'|'admin'|'member';joined_at:string;last_read_at:string|null;muted_until:string|null;archived_at:string|null}; Insert:Record<string,unknown>; Update:Record<string,unknown>; Relationships:[] }
      messages: { Row:{id:string;conversation_id:string;sender_id:string;message_type:'text'|'image'|'video'|'audio'|'voice'|'file'|'system'|'call';body:string|null;reply_to_id:string|null;metadata:Json;edited_at:string|null;deleted_at:string|null;created_at:string;updated_at:string}; Insert:Record<string,unknown>; Update:Record<string,unknown>; Relationships:[] }
      message_attachments: RecordTable
      conversation_message_reactions: RecordTable
      message_read_receipts: RecordTable
      calls: { Row:{id:string;company_id:string;conversation_id:string|null;ticket_id:string|null;asset_id:string|null;team_id:string|null;initiator_id:string;call_type:'audio'|'video';status:'initiating'|'ringing'|'connecting'|'connected'|'ended'|'declined'|'missed'|'failed'|'disconnected';started_at:string|null;connected_at:string|null;ended_at:string|null;end_reason:string|null;metadata:Json;created_at:string;updated_at:string}; Insert:Record<string,unknown>; Update:Record<string,unknown>; Relationships:[] }
      call_participants_v2: RecordTable
      assets: RecordTable
      asset_assignments: RecordTable
      asset_history: RecordTable
      asset_images: RecordTable
      asset_maintenance: RecordTable
      asset_tickets: RecordTable
      tickets: RecordTable
      ticket_categories: RecordTable
      ticket_assignments: RecordTable
      ticket_attachments: RecordTable
      ticket_comments: RecordTable
      ticket_escalations: RecordTable
      ticket_resolutions: RecordTable
      ticket_sla_policies: RecordTable
      ticket_status_history: RecordTable
      ticket_watchers: RecordTable
      attendance: RecordTable
      audit_logs: RecordTable
      notifications: RecordTable
      notification_devices: RecordTable
      notification_deliveries: RecordTable
      notification_preferences: RecordTable
      payments: RecordTable
      subscriptions: RecordTable
      subscription_events: RecordTable
      qr_codes: RecordTable
      qr_restrictions: RecordTable
      qr_scan_logs: RecordTable
      team_members: RecordTable
      team_messages: RecordTable
      message_reads: RecordTable
      message_reactions: RecordTable
      video_calls: RecordTable
      call_participants: RecordTable
      call_recordings: RecordTable
      workspace_favorites: RecordTable
      workspace_file_versions: RecordTable
      workspace_files: RecordTable
      workspace_folders: RecordTable
      workspace_shares: RecordTable
    }
    Views: { [_ in never]: never }
    Functions: { [key:string]: { Args: Record<string, unknown>; Returns: unknown } }
    Enums: {
      asset_condition:'new'|'good'|'fair'|'poor'|'damaged'; asset_status:'active'|'assigned'|'maintenance'|'retired'|'lost'; attendance_status:'present'|'late'|'absent'|'excused'; audit_action:'create'|'update'|'delete'|'login'|'logout'|'access'|'export'|'invite'|'approve'|'reject'; billing_interval:'monthly'|'yearly'|'custom'; call_participant_status:'invited'|'joined'|'left'|'declined'; call_status:'scheduled'|'waiting'|'active'|'ended'|'cancelled'; company_status:'active'|'suspended'|'archived'; membership_role:'admin'|'hr'|'manager'|'employee'|'contractor'|'viewer'; message_visibility:'team'|'private'; notification_channel:'in_app'|'push'|'email'|'sms'; notification_delivery_status:'pending'|'sent'|'delivered'|'failed'|'read'; payment_status:'pending'|'succeeded'|'failed'|'refunded'|'cancelled'; qr_code_status:'active'|'disabled'|'expired'; subscription_status:'trialing'|'active'|'past_due'|'paused'|'cancelled'|'expired'; ticket_channel:'portal'|'email'|'phone'|'chat'|'other'; ticket_comment_type:'public'|'internal'; ticket_priority:'low'|'medium'|'high'|'urgent'; ticket_status:'open'|'in_progress'|'pending'|'resolved'|'closed'; workspace_file_kind:'file'|'folder'; workspace_share_role:'viewer'|'editor'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DefaultSchema = Database['public']
export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T]

export type {
  AssetStatus, AssetCondition, TicketStatus, TicketPriority, TicketChannel, UserRole,
  ConversationKind, MessageType, CallType, CallStatus, Company, Department, Team, User,
  Asset, AssetAssignment, AssetImage, AssetMaintenance, AssetHistory, AssetTicket,
  AssetInsert, AssetUpdate, AssetFilters, Ticket, TicketAssignment, TicketAttachment,
  TicketComment, TicketStatusHistory, TicketResolution, TicketSlaPolicy, TicketWithRelations,
  AuditLog, Conversation, ConversationMember, Message, MessageAttachment, MessageReaction,
  MessageReadReceipt, Call, CallParticipant,
} from './domain'
export { transformDbAsset, transformDbUser, transformDbTicket } from './domain'
