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
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-dashed border-slate-200">
          <AlertCircle className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1 text-center">No tickets found</h3>
        <p className="text-slate-500 text-center text-xs max-w-sm">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Compact premium folder-style grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3 p-3 md:p-4">
        {tickets.map((ticket) => {
          const config = gradientConfig[ticket.status] || gradientConfig.closed;
          const statusLabel = statusLabels[ticket.status] || 'Unknown';

          return (
            <div
              key={ticket.id}
              onClick={() => onRowClick?.(ticket.id)}
              className="group cursor-pointer"
            >
              {/* Folder-style card (slimmer) */}
              <div className="relative h-40 md:h-44 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 bg-slate-50/80 dark:bg-slate-900/70 overflow-hidden transition-all duration-200">
                {/* Folder top with colored band and tab */}
                <div className="relative h-16">
                  {/* Colored band */}
                  <div className={`absolute inset-x-0 top-0 h-10 bg-gradient-to-r ${config.gradient}`} />

                  {/* Folder tab */}
                  <div className="absolute left-4 top-6 h-6 w-28 rounded-t-xl bg-slate-900/80 dark:bg-black/70 border border-white/20 flex items-center px-2 gap-1 backdrop-blur-sm">
                    <FileText className="w-3.5 h-3.5 text-slate-100" />
                    <span className="text-[11px] font-medium text-slate-100 truncate">
                      {statusLabel}
                    </span>
                  </div>

                  {/* Soft highlight */}
                  <div className="absolute -right-6 -top-10 w-20 h-20 bg-white/20 rounded-full blur-2xl opacity-70" />

                  {/* Action (e.g. delete) on top-right */}
                  {actions && (
                    <div
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(ticket)}
                    </div>
                  )}
                </div>

                {/* Folder body */}
                <div className="absolute inset-x-2 bottom-2 top-10 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800 px-3 py-2.5 flex flex-col justify-between">
                  {/* Title + priority */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-[15px] font-semibold text-slate-900 dark:text-slate-50 line-clamp-2">
                        {ticket.title}
                      </h3>
                    </div>
                    {ticket.priority && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          ticket.priority === 'high'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : ticket.priority === 'medium'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {ticket.description && (
                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {ticket.description}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center justify-between pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] text-slate-500">
                        {new Date(ticket.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {ticket.assignee && (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
                          Assigned to <span className="font-medium">{ticket.assignee.full_name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="hidden sm:inline">Open</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}