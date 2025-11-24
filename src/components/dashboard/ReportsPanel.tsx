import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, Users, Package, Ticket, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ReportsPanelProps {
  noCard?: boolean
}

export default function ReportsPanel({ noCard = false }: ReportsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('No data to export')
      return
    }

    // Get headers from first object
    const headers = Object.keys(data[0])
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value || '').replace(/"/g, '""')
          return escaped.includes(',') ? `"${escaped}"` : escaped
        }).join(',')
      )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const downloadExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
    if (data.length === 0) {
      alert('No data to export')
      return
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Generate Excel file and download
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleUsersReport = async (format: 'csv' | 'excel' = 'excel') => {
    setLoading('users')
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data.map(user => ({
        ID: user.id,
        Name: user.full_name,
        Email: user.email,
        Role: user.role,
        'Created At': new Date(user.created_at).toLocaleDateString()
      }))

      if (format === 'excel') {
        downloadExcel(formattedData, 'users_report', 'Users')
      } else {
        downloadCSV(formattedData, 'users_report')
      }
    } catch (error) {
      console.error('Error generating users report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(null)
    }
  }

  const handleAssetsReport = async (format: 'csv' | 'excel' = 'excel') => {
    setLoading('assets')
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          serial_number,
          category,
          status,
          assigned_to,
          assigned_user:assigned_to(full_name),
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data.map(asset => {
        const assignedUser = (asset as any).assigned_user
        return {
          ID: asset.id,
          Name: asset.name,
          'Serial Number': asset.serial_number || 'N/A',
          Category: asset.category || 'N/A',
          Status: asset.status,
          'Assigned To': assignedUser ? assignedUser.full_name : 'Unassigned',
          'Created At': new Date(asset.created_at).toLocaleDateString()
        }
      })

      if (format === 'excel') {
        downloadExcel(formattedData, 'assets_report', 'Assets')
      } else {
        downloadCSV(formattedData, 'assets_report')
      }
    } catch (error) {
      console.error('Error generating assets report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(null)
    }
  }

  const handleTicketsReport = async (format: 'csv' | 'excel' = 'excel') => {
    setLoading('tickets')
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          created_by,
          creator:created_by(full_name),
          assigned_to,
          assignee:assigned_to(full_name),
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data.map(ticket => ({
        ID: ticket.id,
        Title: ticket.title,
        Description: ticket.description || 'N/A',
        Status: ticket.status,
        Priority: ticket.priority || 'N/A',
        'Created By': (ticket as any).creator?.full_name || 'Unknown',
        'Assigned To': (ticket as any).assignee?.full_name || 'Unassigned',
        'Created At': new Date(ticket.created_at).toLocaleDateString(),
        'Last Updated': new Date(ticket.updated_at).toLocaleDateString()
      }))

      if (format === 'excel') {
        downloadExcel(formattedData, 'tickets_report', 'Tickets')
      } else {
        downloadCSV(formattedData, 'tickets_report')
      }
    } catch (error) {
      console.error('Error generating tickets report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(null)
    }
  }

  const handleFullSystemReport = async (format: 'csv' | 'excel' = 'excel') => {
    setLoading('system')
    try {
      // Fetch all data
      const [usersRes, assetsRes, ticketsRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('assets').select('*'),
        supabase.from('tickets').select('*')
      ])

      if (usersRes.error || assetsRes.error || ticketsRes.error) {
        throw new Error('Failed to fetch system data')
      }

      // Create summary report
      const summary = {
        'Report Generated': new Date().toLocaleString(),
        'Total Users': usersRes.data.length,
        'Total Assets': assetsRes.data.length,
        'Total Tickets': ticketsRes.data.length,
        'Active Assets': assetsRes.data.filter(a => a.status === 'active' || a.status === 'assigned').length,
        'Available Assets': assetsRes.data.filter(a => a.status === 'available').length,
        'Open Tickets': ticketsRes.data.filter(t => t.status === 'open').length,
        'Closed Tickets': ticketsRes.data.filter(t => t.status === 'closed' || t.status === 'resolved').length,
        'Admins': usersRes.data.filter(u => u.role === 'admin').length,
        'Technicians': usersRes.data.filter(u => u.role === 'technician').length,
        'Employees': usersRes.data.filter(u => u.role === 'employee').length
      }

      if (format === 'excel') {
        downloadExcel([summary], 'system_summary_report', 'Summary')
      } else {
        downloadCSV([summary], 'system_summary_report')
      }
    } catch (error) {
      console.error('Error generating system report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(null)
    }
  }

  const reports = [
    {
      id: 'users',
      title: 'Users Report',
      description: 'Export all users with roles and details',
      icon: Users,
      action: handleUsersReport
    },
    {
      id: 'assets',
      title: 'Assets Report',
      description: 'Export all assets with assignment info',
      icon: Package,
      action: handleAssetsReport
    },
    {
      id: 'tickets',
      title: 'Tickets Report',
      description: 'Export all tickets with status and history',
      icon: Ticket,
      action: handleTicketsReport
    },
    {
      id: 'system',
      title: 'System Summary',
      description: 'Export overall system statistics',
      icon: FileText,
      action: handleFullSystemReport
    }
  ]

  const content = (
    <>
      {!noCard && (
        <CardHeader className="p-4 lg:p-6">
          <CardTitle className="text-xl lg:text-2xl">Reports & Export</CardTitle>
        </CardHeader>
      )}
      <CardContent className={`${noCard ? 'p-0' : 'p-4 lg:p-6'} space-y-4 lg:space-y-6`}>
        {/* Reports Grid - 1 column on mobile, 2 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-3 lg:p-4 rounded-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30 hover:bg-white/50 dark:hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3 lg:mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <report.icon className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm lg:text-base mb-1 truncate">
                    {report.title}
                  </h3>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {report.description}
                  </p>
                </div>
              </div>
              
              {/* Download buttons - Stack on mobile, side-by-side on larger screens */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => report.action('excel')}
                  disabled={loading === report.id}
                  className="flex-1 h-11 lg:h-10"
                  variant="default"
                  size="sm"
                >
                  {loading === report.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      <span className="text-xs lg:text-sm">Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-xs lg:text-sm">Excel</span>
                    </div>
                  )}
                </Button>
                <Button
                  onClick={() => report.action('csv')}
                  disabled={loading === report.id}
                  className="flex-1 h-11 lg:h-10"
                  variant="outline"
                  size="sm"
                >
                  {loading === report.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      <span className="text-xs lg:text-sm">Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Download className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-xs lg:text-sm">CSV</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Note */}
        <div className="p-3 lg:p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-xs lg:text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Reports can be exported in Excel (.xlsx) or CSV format and include data up to the current moment. 
            All timestamps are in your local timezone.
          </p>
        </div>
      </CardContent>
    </>
  )

  if (noCard) {
    return content
  }

  return (
    <Card className="backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 border-white/20 dark:border-gray-700/20">
      {content}
    </Card>
  )
}