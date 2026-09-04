import type { Json } from './supabase'

export type AssetStatus = 'available' | 'active' | 'assigned' | 'maintenance' | 'retired' | 'lost'
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged'
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type UserRole = 'admin' | 'hr' | 'manager' | 'employee' | 'contractor' | 'viewer'

export interface Company {
  id: string; name: string; email: string | null; phone: string | null; address: string | null
  website: string | null; logo_url: string | null; status: 'active' | 'suspended' | 'archived'
  created_at: string; updated_at: string
}
export interface Department { id: string; company_id: string; name: string; description: string | null; manager_id: string | null; created_at: string; updated_at: string }
export interface Team { id: string; company_id: string; name: string; description: string | null; department_id: string | null; team_lead_id: string | null; created_by: string | null; avatar_color: string | null; created_at: string; updated_at: string }
export interface User { id: string; full_name: string; avatar_url: string | null; phone: string | null; last_seen_at: string | null; is_online: boolean; company_id?: string; role?: UserRole; department_id?: string | null; email?: string | null; created_at: string; updated_at: string }
export interface Asset { id: string; company_id: string; asset_tag: string; name: string; description: string | null; category: string | null; manufacturer: string | null; model: string | null; serial_number: string | null; status: AssetStatus; condition: AssetCondition; purchase_date: string | null; purchase_cost: number | null; warranty_expires_at: string | null; location: string | null; notes: string | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string; assigned_to?: string | null; assigned_at?: string | null; photo_url?: string | null; assigned_user?: { id?: string; full_name?: string | null; email?: string | null; avatar_url?: string | null; role?: string | null } | null }
export type AssetInsert = Omit<Asset, 'id' | 'created_at' | 'updated_at' | 'metadata'> & { metadata?: Json }
export type AssetUpdate = Partial<Omit<Asset, 'id' | 'company_id' | 'created_at' | 'updated_at'>>
export type AssetWithRelations = Asset & { assigned_user?: User | User[] | null }

export interface Ticket { id: string; ticket_number: number; company_id: string; subject: string; title?: string; description: string | null; status: TicketStatus; priority: TicketPriority; channel: 'portal' | 'email' | 'phone' | 'chat' | 'other'; category_id: string | null; requester_id: string; created_by: string; accepted_by: string | null; accepted_at: string | null; resolved_at: string | null; closed_at: string | null; due_at: string | null; photo_url: string | null; metadata: Json; created_at: string; updated_at: string; asset?: { name?: string | null; serial_number?: string | null } | null; assignee?: User | null }
export type TicketWithRelations = Ticket & { category?: any; creator?: User | null; requester?: User | null; assignment?: any; status_history?: any[] }
export interface AuditLog { id: string; company_id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; description: string | null; changes: Json; metadata: Json; ip_address?: unknown; user_agent: string | null; occurred_at: string; created_at: string }
export type AssetFilters = { status?: AssetStatus; assignedTo?: string; category?: string; search?: string }

export function transformDbAsset(asset: AssetWithRelations): Asset { return asset }
export function transformDbUser(user: User): User { return user }
export function transformDbTicket(ticket: TicketWithRelations): TicketWithRelations { return ticket }

/** Compatibility aliases for older imports. New feature code should import from its feature/data module. */
export type Database = any
