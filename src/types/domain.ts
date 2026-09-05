import type { Json } from './database'

export type AssetStatus='active'|'assigned'|'maintenance'|'retired'|'lost'
export type AssetCondition='new'|'good'|'fair'|'poor'|'damaged'
export type TicketStatus='open'|'in_progress'|'pending'|'resolved'|'closed'
export type TicketPriority='low'|'medium'|'high'|'urgent'
export type TicketChannel='portal'|'email'|'phone'|'chat'|'other'
export type UserRole='admin'|'hr'|'manager'|'employee'|'contractor'|'viewer'
export type ConversationKind='direct'|'group'|'team'|'ticket'
export type MessageType='text'|'image'|'video'|'audio'|'voice'|'file'|'system'|'call'
export type CallType='audio'|'video'
export type CallStatus='initiating'|'ringing'|'connecting'|'connected'|'ended'|'declined'|'missed'|'failed'|'disconnected'

export interface Company{id:string;name:string;email:string|null;phone:string|null;address:string|null;website:string|null;logo_url:string|null;status:'active'|'suspended'|'archived';created_at:string;updated_at:string}
export interface Department{id:string;company_id:string;name:string;description:string|null;manager_id:string|null;created_at:string;updated_at:string}
export interface Team{id:string;company_id:string;name:string;description:string|null;department_id:string|null;team_lead_id:string|null;created_by:string|null;avatar_color:string|null;created_at:string;updated_at:string}
export interface User{id:string;username:string;full_name:string;avatar_path:string|null;phone:string|null;last_seen_at:string|null;is_online:boolean;company_id?:string;role?:UserRole;department_id?:string|null;email?:string|null;created_at:string;updated_at:string}
export interface Asset{id:string;company_id:string;asset_tag:string;name:string;description:string|null;category:string|null;manufacturer:string|null;model:string|null;serial_number:string|null;status:AssetStatus;condition:AssetCondition;purchase_date:string|null;purchase_cost:number|null;warranty_expires_at:string|null;location:string|null;notes:string|null;metadata:Json;created_by:string|null;created_at:string;updated_at:string;archived_at:string|null}
export interface AssetAssignment{id:string;asset_id:string;assigned_to:string;assigned_by:string;assigned_at:string;returned_at:string|null;condition_at_assignment:AssetCondition|null;condition_at_return:AssetCondition|null;notes:string|null}
export interface AssetImage{id:string;asset_id:string;storage_path:string;file_name:string;mime_type:string|null;file_size_bytes:number|null;width:number|null;height:number|null;alt_text:string|null;is_primary:boolean;uploaded_by:string|null;created_at:string}
export interface AssetMaintenance{id:string;asset_id:string;maintenance_type:string;status:string;description:string;performed_by:string|null;vendor_name:string|null;cost:number|null;started_at:string|null;completed_at:string|null;next_due_at:string|null;notes:string|null;created_by:string|null;created_at:string;updated_at:string}
export interface AssetHistory{id:string;asset_id:string;actor_id:string|null;event_type:string;description:string|null;previous_status:AssetStatus|null;new_status:AssetStatus|null;metadata:Json;created_at:string}
export interface AssetTicket{asset_id:string;ticket_id:string;created_at:string}
export type AssetInsert=Omit<Asset,'id'|'created_at'|'updated_at'|'archived_at'>&{metadata?:Json}
export type AssetUpdate=Partial<Omit<Asset,'id'|'company_id'|'created_at'|'updated_at'>>
export type AssetFilters={status?:AssetStatus;assignedTo?:string;category?:string;search?:string}
export interface Ticket{id:string;ticket_number:number;company_id:string;subject:string;description:string|null;status:TicketStatus;priority:TicketPriority;channel:TicketChannel;category_id:string|null;department_id:string|null;team_id:string|null;requester_id:string;created_by:string;accepted_by:string|null;accepted_at:string|null;resolved_at:string|null;closed_at:string|null;due_at:string|null;first_response_due_at:string|null;first_responded_at:string|null;sla_policy_id:string|null;sla_breached_at:string|null;waiting_reason:string|null;escalation_level:number;archived_at:string|null;metadata:Json;created_at:string;updated_at:string}
export interface TicketAssignment{id:string;ticket_id:string;assignee_id:string;assigned_by:string;department_id:string|null;team_id:string|null;assigned_at:string;unassigned_at:string|null;note:string|null}
export interface TicketAttachment{id:string;ticket_id:string;comment_id:string|null;uploaded_by:string;storage_path:string;file_name:string;mime_type:string|null;file_size_bytes:number|null;created_at:string}
export interface TicketComment{id:string;ticket_id:string;author_id:string;comment_type:'public'|'internal';body:string;created_at:string;updated_at:string;deleted_at:string|null}
export interface TicketStatusHistory{id:string;ticket_id:string;from_status:TicketStatus|null;to_status:TicketStatus;changed_by:string|null;note:string|null;changed_at:string}
export interface TicketResolution{id:string;ticket_id:string;resolved_by:string;resolution_type:string;resolution_summary:string;created_at:string;updated_at:string}
export interface TicketSlaPolicy{id:string;company_id:string;name:string;department_id:string|null;category_id:string|null;priority:TicketPriority|null;first_response_minutes:number;resolution_minutes:number;is_active:boolean;created_at:string;updated_at:string}
export interface TicketWithRelations extends Ticket{status_history?:TicketStatusHistory[];attachments?:TicketAttachment[];comments?:TicketComment[];resolution?:TicketResolution|null}
export interface AuditLog{id:string;company_id:string;actor_id:string|null;action:string;entity_type:string;entity_id:string|null;description:string|null;changes:Json;metadata:Json;ip_address?:unknown;user_agent:string|null;occurred_at:string;created_at:string}
export interface Conversation{id:string;company_id:string;kind:ConversationKind;title:string|null;avatar_path:string|null;metadata:Json;created_by:string;created_at:string;updated_at:string}
export interface ConversationMember{conversation_id:string;user_id:string;role:'owner'|'admin'|'member';joined_at:string;last_read_at:string|null;muted_until:string|null;archived_at:string|null}
export interface Message{id:string;conversation_id:string;sender_id:string;message_type:MessageType;body:string|null;reply_to_id:string|null;metadata:Json;edited_at:string|null;deleted_at:string|null;created_at:string;updated_at:string}
export interface MessageAttachment{id:string;message_id:string;storage_path:string;file_name:string;mime_type:string;file_size_bytes:number;width:number|null;height:number|null;duration_seconds:number|null;created_at:string}
export interface MessageReaction{message_id:string;user_id:string;reaction:string;created_at:string}
export interface MessageReadReceipt{message_id:string;user_id:string;read_at:string}
export interface Call{id:string;company_id:string;conversation_id:string|null;ticket_id:string|null;asset_id:string|null;team_id:string|null;initiator_id:string;call_type:CallType;status:CallStatus;started_at:string|null;connected_at:string|null;ended_at:string|null;end_reason:string|null;metadata:Json;created_at:string;updated_at:string}
export interface CallParticipant{call_id:string;user_id:string;role:'initiator'|'participant';status:'invited'|'ringing'|'connecting'|'connected'|'declined'|'missed'|'joined'|'left';joined_at:string|null;left_at:string|null;created_at:string}

export const transformDbAsset=(asset:Asset):Asset=>asset
export const transformDbUser=(user:User):User=>user
export const transformDbTicket=(ticket:TicketWithRelations):TicketWithRelations=>ticket
