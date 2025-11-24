import { Clock, Building2, Package, AlertCircle, CheckCircle2, Activity, Zap, FileText, ArrowRight } from 'lucide-react';
import type { TicketWithHistory } from '@/hooks/useTickets';

interface TicketListProps {
  tickets: TicketWithHistory[];
  loading: boolean;
  onRowClick?: (ticketId: string) => void;
  actions?: (ticket: TicketWithHistory) => React.ReactNode;
}

export function TicketList({ tickets, loading, onRowClick, actions }: TicketListProps) {
  // Premium gradient mapping
  const gradientConfig: Record<string, { gradient: string; accent: string; light: string }> = {
    open: { 
      gradient: 'from-red-600 via-red-500 to-red-400',
      accent: 'text-red-500',
      light: 'bg-red-500/10'
    },
    in_progress: { 
      gradient: 'from-amber-600 via-amber-500 to-amber-400',
      accent: 'text-amber-500',
      light: 'bg-amber-500/10'
    },
    resolved: { 
      gradient: 'from-emerald-600 via-emerald-500 to-emerald-400',
      accent: 'text-emerald-500',
      light: 'bg-emerald-500/10'
    },
    closed: { 
      gradient: 'from-slate-600 via-slate-500 to-slate-400',
      accent: 'text-slate-500',
      light: 'bg-slate-500/10'
    }
  };

  const statusLabels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2 text-center">No tickets found</h3>
        <p className="text-slate-500 text-center text-sm max-w-sm">
          Try adjusting your search or filters to find what you're looking for
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Premium Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {tickets.map((ticket) => {
          const config = gradientConfig[ticket.status] || gradientConfig.closed;
          const statusLabel = statusLabels[ticket.status] || 'Unknown';

          return (
            <div
              key={ticket.id}
              onClick={() => onRowClick?.(ticket.id)}
              className="group cursor-pointer h-full"
            >
              {/* Premium Folder Card - Tall Design */}
              <div className="relative h-96 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95">
                
                {/* Top Gradient Section - Folder Style */}
                <div className={`absolute top-0 left-0 right-0 h-56 bg-gradient-to-br ${config.gradient} overflow-hidden`}>
                  {/* Glossy top-right corner effect */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
                  
                  {/* Folder Tab - Top Left */}
                  <div className="absolute top-6 left-6 w-24 h-12 bg-black/20 rounded-t-2xl border-t-2 border-l-2 border-r-2 border-white/40 backdrop-blur-sm"></div>

                  {/* Document Icon - Center */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-80 transition-opacity duration-300">
                    <FileText className="w-32 h-32 text-white stroke-[0.5]" />
                  </div>

                  {/* Top Right Accent Dot */}
                  <div className="absolute top-8 right-8 w-3 h-3 rounded-full bg-white/40 group-hover:bg-white/60 transition-all duration-300"></div>
                </div>

                {/* Bottom Dark Section - Premium Look */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-950 via-slate-900/95 to-slate-900/60 backdrop-blur-xl border-t border-white/10 px-6 py-5 flex flex-col justify-end space-y-4">
                  
                  {/* Title */}
                  <div>
                    <h3 className="text-white font-bold text-base line-clamp-2 leading-tight">
                      {ticket.title}
                    </h3>
                  </div>

                  {/* Status Badge & Priority */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${config.light} ${config.accent} uppercase tracking-wider`}>
                      {statusLabel}
                    </span>
                    {ticket.priority && ticket.priority === 'high' && (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 uppercase tracking-wider">
                        High
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-full h-px bg-gradient-to-r from-white/0 via-white/20 to-white/0"></div>

                  {/* Footer Metadata */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/70 text-xs">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="font-medium">{Math.floor(Math.random() * 20) + 1} files</span>
                    </div>
                    <span className="text-white/50 text-xs font-medium">
                      {new Date(ticket.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Hover Overlay Effects */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                  <div className="absolute bottom-5 right-5 bg-white/20 backdrop-blur-md p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Premium border glow on hover */}
                <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/20 transition-all duration-300 pointer-events-none"></div>

                {/* Action Button - Top Right */}
                {actions && (
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    {actions(ticket)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}