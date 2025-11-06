import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EmployeeStats } from '@/hooks/useAnalytics'

interface EmployeePerformanceProps {
  employees: EmployeeStats[]
}

export function EmployeePerformance({ employees }: EmployeePerformanceProps) {
  const sorted = [...employees].sort((a, b) => b.ticketsResolved - a.ticketsResolved)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Tickets Created</TableHead>
                <TableHead className="text-center">Tickets Resolved</TableHead>
                <TableHead className="text-center">Avg Resolution (h)</TableHead>
                <TableHead className="text-center">Assets Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((emp) => (
                <TableRow key={emp.userId}>
                  <TableCell className="font-medium">{emp.fullName}</TableCell>
                  <TableCell className="text-center">{emp.ticketsCreated}</TableCell>
                  <TableCell className="text-center font-semibold text-green-600">
                    {emp.ticketsResolved}
                  </TableCell>
                  <TableCell className="text-center">{emp.avgResolutionTime}</TableCell>
                  <TableCell className="text-center">{emp.assetsAssigned}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}