import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  headers: string[]
  children: ReactNode
  className?: string
  mobileView?: 'cards' | 'scroll'
}

/**
 * ResponsiveTable - Table that converts to cards on mobile or allows horizontal scroll
 * 
 * Features:
 * - Desktop: Full table display
 * - Mobile: Either converts to card view OR horizontal scroll
 * 
 * Usage:
 * <ResponsiveTable headers={['Name', 'Status', 'Date']} mobileView="cards">
 *   <tbody>
 *     <tr>
 *       <td>Item 1</td>
 *       <td>Active</td>
 *       <td>2024-01-01</td>
 *     </tr>
 *   </tbody>
 * </ResponsiveTable>
 */
export function ResponsiveTable({
  headers,
  children,
  className,
  mobileView = 'scroll'
}: ResponsiveTableProps) {
  if (mobileView === 'scroll') {
    return (
      <div className="w-full overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-slate-200 sm:rounded-lg">
            <table className={cn('min-w-full divide-y divide-slate-200', className)}>
              <thead className="bg-slate-50">
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              {children}
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Card view for mobile - requires custom rendering per use case
  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop table view */}
      <div className="hidden md:block overflow-hidden border border-slate-200 rounded-lg">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          {children}
        </table>
      </div>

      {/* Mobile card view - Note: Requires custom implementation per table */}
      <div className="md:hidden space-y-3">
        {/* Cards will be rendered by parent component */}
        {children}
      </div>
    </div>
  )
}