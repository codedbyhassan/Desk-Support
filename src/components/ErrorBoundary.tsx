import { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              {this.props.componentName || 'Component'} Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-red-700 dark:text-red-300">
              {this.state.error?.message || 'An error occurred'}
            </p>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}