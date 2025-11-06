import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package } from 'lucide-react'
import { Button } from './ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command'
import { useAssets } from '@/hooks/useAssets'
import { useTickets } from '@/hooks/useTickets'

export function SearchCommand() {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const { assets } = useAssets()
  const { tickets } = useTickets()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" aria-hidden="true" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search all assets and tickets..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Assets">
            {assets.slice(0, 5).map((asset) => (
              <CommandItem
                key={asset.id}
                value={asset.name}
                onSelect={() => {
                  navigate(`/assets/${asset.id}`)
                  setOpen(false)
                }}
              >
                <Package className="mr-2 h-4 w-4" />
                {asset.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tickets">
            {tickets.slice(0, 5).map((ticket) => (
              <CommandItem
                key={ticket.id}
                value={ticket.title}
                onSelect={() => {
                  navigate(`/tickets/${ticket.id}`)
                  setOpen(false)
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                {ticket.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}