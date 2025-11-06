import { ExternalLink, MapPin, Clock, User, AlertCircle, Building2, Package, ArrowRight } from 'lucide-react';
import type { TicketWithHistory } from '@/hooks/useTickets';

interface TicketListProps {
  tickets: TicketWithHistory[];
  loading: boolean;
  onRowClick?: (ticketId: string) => void;
  actions?: (ticket: TicketWithHistory) => React.ReactNode;
}

export function TicketList({ tickets, loading, onRowClick, actions }: TicketListProps) {
  const statusColors: Record<string, string> = {
    open: 'bg-red-500',
    in_progress: 'bg-amber-500',
    resolved: 'bg-emerald-500',
    closed: 'bg-slate-500'
  };

  const statusGradients: Record<string, string> = {
    open: 'from-red-500/10 to-transparent',
    in_progress: 'from-amber-500/10 to-transparent',
    resolved: 'from-emerald-500/10 to-transparent',
    closed: 'from-slate-500/10 to-transparent'
  };

  const priorityConfig: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    urgent: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 lg:py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 lg:h-12 lg:w-12 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 lg:py-16 px-4">
        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 lg:mb-4">
          <AlertCircle className="h-6 w-6 lg:h-8 lg:w-8 text-slate-400" />
        </div>
        <h3 className="text-base lg:text-lg font-semibold text-slate-900 mb-2 text-center">No tickets found</h3>
        <p className="text-slate-500 text-center text-sm lg:text-base max-w-sm">
          Try adjusting your search or filters to find what you're looking for
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-3 lg:p-4 space-y-3 lg:space-y-4">
      {/* Desktop: Grid Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {tickets.map((ticket, index) => renderTicketCard(ticket, index, true))}
      </div>

      {/* Mobile: Stack Layout */}
      <div className="lg:hidden space-y-3">
        {tickets.map((ticket, index) => renderTicketCard(ticket, index, false))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );

  function renderTicketCard(ticket: TicketWithHistory, index: number, isDesktop: boolean) {
    const statusColor = statusColors[ticket.status] || statusColors.closed;
    const statusGradient = statusGradients[ticket.status] || statusGradients.closed;
    const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
    
    return (
      <div
        key={ticket.id}
        onClick={() => onRowClick?.(ticket.id)}
        className={`relative group cursor-pointer active:scale-[0.98] transition-transform ${
          isDesktop ? '' : 'border-b border-slate-200 last:border-b-0 pb-3 last:pb-0'
        }`}
        style={{
          animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
        }}
      >
        {/* Main ticket card - Different layouts for mobile vs desktop */}
        <div className={`
          relative bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200 hover:border-slate-300 
          transition-all duration-300 overflow-hidden group-hover:scale-[1.02] 
          ${isDesktop 
            ? 'p-5 h-full flex flex-col' 
            : 'p-4 active:bg-slate-50'
          }
        `}>
          
          {/* Decorative gradient background - Only on desktop */}
          {isDesktop && (
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${statusGradient} rounded-full blur-2xl`}></div>
          )}
          
          {/* Status indicator bar */}
          <div className={`absolute top-0 left-0 w-1 h-full ${statusColor} transition-all group-hover:w-1.5`}></div>

          {/* Actions (Admin only) - Different positioning for mobile */}
          {actions && (
            <div className={`
              z-10 opacity-0 group-hover:opacity-100 transition-opacity
              ${isDesktop 
                ? 'absolute top-4 right-4' 
                : 'absolute top-3 right-3 opacity-100'
              }
            `}>
              {actions(ticket)}
            </div>
          )}
          
          {/* Content */}
          <div className={`relative flex-1 ${isDesktop ? 'flex flex-col' : ''}`}>
            {/* Top section: Status badge and priority */}
            <div className={`flex items-center gap-2 ${isDesktop ? 'mb-3' : 'mb-2'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></div>
                <span className="text-xs font-medium text-slate-600 capitalize">
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              {ticket.priority && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text} border ${priority.border}`}>
                  {ticket.priority}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={`
              font-semibold text-slate-900 group-hover:text-slate-700 transition-colors
              ${isDesktop 
                ? 'text-base mb-2 line-clamp-2 min-h-[3rem] pr-8' 
                : 'text-sm mb-2 line-clamp-2 pr-12'
              }
            `}>
              {ticket.title}
            </h3>

            {/* Description preview - Only on desktop */}
            {ticket.description && isDesktop && (
              <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                {ticket.description}
              </p>
            )}

            {/* Metadata section - Simplified on mobile */}
            <div className={`
              ${isDesktop 
                ? 'flex-1 space-y-2.5 mb-4' 
                : 'grid grid-cols-2 gap-2 mb-3'
              }
            `}>
              {/* Department */}
              {ticket.department && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-slate-600" />
                  </div>
                  <span className="text-xs lg:text-sm text-slate-700 font-medium truncate">
                    {ticket.department.name}
                  </span>
                </div>
              )}

              {/* Asset */}
              {ticket.asset && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs lg:text-sm text-slate-700 truncate">
                    {ticket.asset.name}
                  </span>
                </div>
              )}

              {/* Category */}
              {ticket.category && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 lg:w-7 lg:h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs lg:text-sm text-slate-700 truncate">
                    {ticket.category}
                  </span>
                </div>
              )}
              
              {/* Assignee */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 lg:w-7 lg:h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-slate-600" />
                </div>
                {ticket.assignee ? (
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-xs lg:text-sm text-slate-700 font-medium truncate">
                      {ticket.assignee.full_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs lg:text-sm text-amber-600 font-medium">Unassigned</span>
                )}
              </div>
            </div>

            {/* Bottom section: Date and action */}
            <div className={`
              flex items-center justify-between pt-3 border-t border-slate-100
              ${isDesktop ? '' : 'mt-2'}
            `}>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">
                    {new Date(ticket.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: isDesktop ? 'numeric' : undefined
                    })}
                  </span>
                  {ticket.updated_at !== ticket.created_at && isDesktop && (
                    <span className="text-[10px] text-slate-400">
                      Updated {new Date(ticket.updated_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick?.(ticket.id);
                }}
                className={`
                  bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all duration-200 
                  hover:scale-110 shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 
                  flex items-center justify-center group active:scale-95
                  ${isDesktop 
                    ? 'w-8 h-8' 
                    : 'w-7 h-7'
                  }
                `}
                title="View details"
              >
                <ArrowRight className={`group-hover:translate-x-0.5 transition-transform ${
                  isDesktop ? 'h-4 w-4' : 'h-3.5 w-3.5'
                }`} />
              </button>
            </div>
          </div>

          {/* Hover effect overlay - Only on desktop */}
          {isDesktop && (
            <div className="absolute inset-0 border-2 border-slate-900 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          )}
        </div>
      </div>
    );
  }
}