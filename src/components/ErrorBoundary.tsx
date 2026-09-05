import { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props { children: ReactNode; componentName?: string }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }
  componentDidCatch(error: Error) { console.error('ErrorBoundary caught:', error) }
  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children
    return <Card role="alert" className="border-destructive/30 bg-destructive/5">
      <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" aria-hidden="true" />{this.props.componentName || 'This section'} could not load</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{this.state.error?.message || 'An unexpected error occurred. You can try this section again without leaving the workspace.'}</p>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={this.reset}><RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />Try again</Button><Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>Reload app</Button></div>
      </CardContent>
    </Card>
  }
}
