import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', fullPage = false }) => {
  const rows = size === 'sm' ? 3 : size === 'lg' ? 6 : 5
  return (
    <div className={fullPage ? 'min-h-screen w-full bg-background p-4 sm:p-6 lg:p-8' : 'w-full py-6'} role="status" aria-label="Loading">
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-4 w-64 max-w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: Math.min(rows, 4) }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-xl" />)}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="space-y-3">
            {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-3"><Skeleton className="h-10 w-10 shrink-0 rounded-lg" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-2/3" /></div></div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loader
