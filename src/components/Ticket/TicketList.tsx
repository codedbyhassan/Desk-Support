import { Clock, Building2, Package, AlertCircle, CheckCircle2, Activity, Zap, FileText, ArrowRight } from 'lucide-react';
import Loader from '@/components/Loader';
import { getTicketStatusStyle, getPriorityStyle, sizing, typography, colors, darkMode } from '@/lib/theme';
import type { TicketWithHistory } from '@/hooks/useTickets';

interface TicketListProps {
  tickets: TicketWithHistory[];
  loading: boolean;
  onRowClick?: (ticketId: string) => void;
  actions?: (ticket: TicketWithHistory) => React.ReactNode;
}

export function TicketList({ tickets, loading, onRowClick, actions }: TicketListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size="md" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className={`w-12 h-12 ${colors.slate.light} rounded-2xl flex items-center justify-center mb-3 border border-dashed ${colors.slate.borderLight}`}>
          <AlertCircle className={`${sizing.iconLg} ${colors.slate.textLighter}`} />
        </div>
        <h3 className={`text-base font-semibold ${colors.slate.textDark} mb-1 text-center`}>No tickets found</h3>
        <p className={`${colors.slate.text} text-center ${typography.xs} max-w-sm`}>
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
          const statusStyle = getTicketStatusStyle(ticket.status);
          const priorityStyle = getPriorityStyle(ticket.priority || 'low');

          return (
            <div
              key={ticket.id}
              onClick={() => onRowClick?.(ticket.id)}
              className="group cursor-pointer"
            >
              {/* Folder-style card (slimmer) */}
              <div className={`relative h-40 md:h-44 rounded-2xl shadow-sm hover:shadow-md ${colors.slate.borderLight} ${colors.slate.light} ${darkMode.bgSecondary} overflow-hidden transition-all duration-200`}>
                {/* Folder top with colored band and tab */}
                <div className="relative h-16">
                  {/* Colored band */}
                  <div className={`absolute inset-x-0 top-0 h-10 bg-gradient-to-r ${statusStyle.gradient}`} />

                  {/* Folder tab */}
                  <div className={`absolute left-4 top-6 h-6 w-28 rounded-t-xl bg-slate-900/80 dark:bg-black/70 border border-white/20 flex items-center px-2 gap-1 backdrop-blur-sm`}>
                    <FileText className={`w-3.5 h-3.5 text-slate-100`} />
                    <span className={`${typography.xs} font-medium text-slate-100 truncate`}>
                      {statusStyle.label}
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
                <div className={`absolute inset-x-2 bottom-2 top-10 rounded-xl bg-white ${darkMode.bgTertiary} ${colors.slate.borderLight} ${darkMode.border} px-3 py-2.5 flex flex-col justify-between`}>
                  {/* Title + priority */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <h3 className={`${typography.base} md:text-[15px] font-semibold ${colors.slate.textDark} ${darkMode.text} line-clamp-2`}>
                        {ticket.title}
                      </h3>
                    </div>
                    {ticket.priority && (
                      <span className={priorityStyle.badge}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {ticket.description && (
                    <p className={`${typography.xs} ${colors.slate.text} ${darkMode.textSecondary} line-clamp-2`}>
                      {ticket.description}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className={`flex items-center justify-between pt-2 mt-auto border-t ${colors.slate.borderLight} ${darkMode.border}`}>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className={`${typography.xs} ${colors.slate.text}`}>
                        {new Date(ticket.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {ticket.assignee && (
                        <span className={`${typography.xs} ${colors.slate.text} ${darkMode.textSecondary} truncate max-w-[160px]`}>
                          Assigned to <span className="font-medium">{ticket.assignee.full_name}</span>
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 ${typography.xs} ${colors.slate.text}`}>
                      <span className="hidden sm:inline">Open</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${colors.slate.textLighter} group-hover:${colors.slate.text} ${darkMode.textSecondary} group-hover:${darkMode.text} transition-colors`} />
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