import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Entry {
	id: string
	status: string
	changed_by?: string
	// some API rows return `null` for changed_by_user, so allow null
	changed_by_user?: { full_name?: string } | null
	created_at: string
}

interface Props {
	entries: Entry[]
}

export function TicketStatusHistory({ entries }: Props) {
	const statusColors: Record<string, string> = {
		open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
		in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
		resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
		closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300'
	}

	if (!entries || entries.length === 0) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle>Status History</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{entries.map((entry) => (
						<div
							key={entry.id}
							className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
						>
							<div>
								<Badge className={statusColors[entry.status]}>
									{entry.status.replace('_', ' ')}
								</Badge>
								<p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
									Changed by {entry.changed_by_user?.full_name || 'Unknown User'}
								</p>
							</div>
							<p className="text-xs text-gray-500">
								{new Date(entry.created_at).toLocaleString()}
							</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
