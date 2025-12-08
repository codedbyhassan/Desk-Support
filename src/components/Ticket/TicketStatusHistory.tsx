import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTicketStatusStyle, darkMode, colors, typography } from '@/lib/theme'

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
	if (!entries || entries.length === 0) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle>Status History</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{entries.map((entry) => {
						const statusStyle = getTicketStatusStyle(entry.status)
						return (
							<div
								key={entry.id}
								className={`flex justify-between items-center p-3 ${colors.neutral.light} ${darkMode.bgSecondary} rounded`}
							>
								<div>
									<Badge className={statusStyle.badge || 'bg-slate-100 text-slate-800'}>
										{statusStyle.label}
									</Badge>
									<p className={`${typography.xs} ${colors.neutral.text} ${darkMode.textSecondary} mt-1`}>
										Changed by {entry.changed_by_user?.full_name || 'Unknown User'}
									</p>
								</div>
								<p className={`${typography.xs} ${colors.neutral.text}`}>
									{new Date(entry.created_at).toLocaleString()}
								</p>
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
