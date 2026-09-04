import { useMemo, useState } from 'react'
import { Eye, Filter, Package, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAssets } from '@/hooks/useAssets'
import type { AssetStatus } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AssetsInventoryProps{fullView?:boolean;noCard?:boolean}
const statuses:Array<'all'|AssetStatus>=['all','active','assigned','maintenance','retired','lost']
function label(value:string){return value.replaceAll('_',' ')}
export default function AssetsInventory({fullView=false,noCard=false}:AssetsInventoryProps){
 const navigate=useNavigate();const {assets,loading}=useAssets();const [search,setSearch]=useState('');const [status,setStatus]=useState<'all'|AssetStatus>('all')
 const filtered=useMemo(()=>assets.filter(asset=>(status==='all'||asset.status===status)&&(!search.trim()||`${asset.name} ${asset.asset_tag} ${asset.serial_number??''} ${asset.category??''}`.toLowerCase().includes(search.trim().toLowerCase()))),[assets,search,status])
 const content=<><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search assets..." value={search} onChange={e=>setSearch(e.target.value)}/></div><Select value={status} onValueChange={v=>setStatus(v as 'all'|AssetStatus)}><SelectTrigger className="w-full sm:w-48"><Filter className="mr-2 h-4 w-4"/><SelectValue/></SelectTrigger><SelectContent>{statuses.map(value=><SelectItem key={value} value={value} className="capitalize">{label(value)}</SelectItem>)}</SelectContent></Select></div>{loading?<div className="p-10 text-center text-sm text-muted-foreground">Loading assets…</div>:filtered.length===0?<div className="p-10 text-center"><Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="font-medium">No assets found</p></div>:<div className={`grid gap-3 p-4 ${fullView?'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4':'sm:grid-cols-2 lg:grid-cols-3'}`}>{filtered.slice(0,fullView?undefined:6).map(asset=><div key={asset.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium">{asset.name}</p><p className="mt-1 text-xs text-muted-foreground">{asset.asset_tag} · {asset.serial_number||'No serial'}</p></div><Badge variant="outline" className="shrink-0 capitalize">{label(asset.status)}</Badge></div><div className="mt-4 space-y-1 text-xs text-muted-foreground"><p>{asset.category||'Uncategorized'}</p><p>{asset.location||'Location not recorded'}</p></div><Button variant="outline" size="sm" className="mt-4 w-full" onClick={()=>navigate(`/app/assets/${asset.id}`)}><Eye className="mr-2 h-4 w-4"/>View asset</Button></div>)}</div>}</>
 return noCard?content:<Card className="overflow-hidden"><CardHeader><CardTitle className="text-base">Asset inventory</CardTitle></CardHeader><CardContent className="p-0">{content}</CardContent></Card>
}
