import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TicketTrendData {
  date: string
  created: number
  resolved: number
}

interface TicketTrendChartProps {
  data: TicketTrendData[]
}

export function TicketTrendChart({ data }: TicketTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Trends (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="created" stroke="hsl(var(--chart-blue))" name="Created" />
            <Line type="monotone" dataKey="resolved" stroke="hsl(var(--chart-green))" name="Resolved" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}