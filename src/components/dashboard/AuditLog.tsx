import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuditLog } from '@/hooks/useAuditLog'

export function AuditLog() {
  const { logs, loading, error, fetchLogs } = useAuditLog()
  const [filterAction, setFilterAction] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  useEffect(() => {
    fetchLogs({
      action: filterAction || undefined,
      targetType: filterType || undefined
    })
  }, [filterAction, filterType])

  const actionColors = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30',
    UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="assets">Assets</option>
            <option value="tickets">Tickets</option>
            <option value="users">Users</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs()}
          >
            Refresh
          </Button>
        </div>

        {loading && <p className="text-center py-4">Loading...</p>}
        {error && <p className="text-center text-red-600 py-4">Error: {error}</p>}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No audit logs</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={actionColors[log.action]}>
                        {log.action}
                      </Badge>
                      <span className="text-sm font-medium">
                        {log.target_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {log.target_id.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      By {log.user?.full_name || 'Unknown'} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}