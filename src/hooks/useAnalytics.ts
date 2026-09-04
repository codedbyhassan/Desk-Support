import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getExactCompanyCounts, type ExactCompanyCounts } from '@/lib/dataAccess'
import { useAuth } from '@/lib/auth'

export interface AnalyticsMetrics { totalTickets:number; resolvedTickets:number; avgResolutionTime:number; totalAssets:number; availableAssets:number; utilizationRate:number }
export interface EmployeeStats { userId:string; fullName:string; ticketsCreated:number; ticketsResolved:number; avgResolutionTime:number; assetsAssigned:number }
export interface TicketTrend { date:string; created:number; resolved:number }
interface AnalyticsPayload { avg_resolution_hours:number; employees:EmployeeStats[]; ticket_trend:TicketTrend[] }
const EMPTY_COUNTS:ExactCompanyCounts={users_total:0,users_unique:0,departments_total:0,teams_total:0,ticket_categories_total:0,tickets_total:0,tickets_open:0,tickets_in_progress:0,tickets_pending:0,tickets_resolved:0,tickets_closed:0,tickets_unresolved:0,tickets_overdue:0,assets_total:0,asset_assignments_active:0,ticket_assignments_active:0,ticket_comments_total:0,ticket_attachments_total:0,workspace_folders_total:0,workspace_files_total:0,notifications_unread:0,attendance_today:0,qr_codes_active:0,qr_scans_today:0,video_calls_total:0,video_calls_active:0,subscriptions_total:0,payments_total:0,audit_logs_total:0}

export function useAnalytics(){
 const {user}=useAuth();const [counts,setCounts]=useState<ExactCompanyCounts>(EMPTY_COUNTS);const [metrics,setMetrics]=useState<AnalyticsMetrics>({totalTickets:0,resolvedTickets:0,avgResolutionTime:0,totalAssets:0,availableAssets:0,utilizationRate:0});const [employeeStats,setEmployeeStats]=useState<EmployeeStats[]>([]);const [ticketTrend,setTicketTrend]=useState<TicketTrend[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState<string|null>(null)
 const fetchAnalytics=useCallback(async()=>{const companyId=user?.company_id;if(!companyId)return;setLoading(true);setError(null);try{const [exact,analyticsResponse]=await Promise.all([getExactCompanyCounts(companyId),supabase.rpc('get_company_analytics',{p_company_id:companyId})]);if(analyticsResponse.error)throw analyticsResponse.error;const payload=(analyticsResponse.data??{}) as unknown as AnalyticsPayload;setCounts(exact??EMPTY_COUNTS);setMetrics({totalTickets:exact.tickets_total,resolvedTickets:exact.tickets_resolved+exact.tickets_closed,avgResolutionTime:Number(payload.avg_resolution_hours??0),totalAssets:exact.assets_total,availableAssets:Math.max(0,exact.assets_total-exact.asset_assignments_active),utilizationRate:exact.assets_total>0?Math.round((exact.asset_assignments_active/exact.assets_total)*100):0});setEmployeeStats(Array.isArray(payload.employees)?payload.employees:[]);setTicketTrend(Array.isArray(payload.ticket_trend)?payload.ticket_trend:[])}catch(err){const message=err instanceof Error?err.message:'Failed to fetch analytics';setError(message);console.error('Analytics error:',err)}finally{setLoading(false)}},[user?.company_id])
 return {counts,metrics,employeeStats,ticketTrend,loading,error,fetchAnalytics}
}
