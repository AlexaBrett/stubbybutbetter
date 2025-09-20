import { useEffect, useMemo, useState } from 'react'
import type { MatchTrace } from './types'
import { Button, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Accordion, AccordionItem, AccordionTrigger, AccordionContent, Select, SelectTrigger, SelectContent, SelectItem, SelectValue, Card, CardHeader, CardContent } from './components/ui'

function ChevronRightIcon (props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function LinkIcon (props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-1.41 1.41a5 5 0 1 0 7.07 7.07L14 19" />
    </svg>
  )
}

function XIcon (props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function usePolling<T> (fn: () => Promise<T>, intervalMs: number) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  async function tick () {
    try {
      setLoading(true)
      const v = await fn()
      setData(v)
      setError(null)
    } catch (e: any) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void tick()
    const id = setInterval(() => { void tick() }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return { data, error, loading, refresh: tick }
}

export default function App () {
  const [limit, setLimit] = useState(10)
  const [selected, setSelected] = useState<MatchTrace | null>(null)
  const [density, setDensity] = useState<'COMFORTABLE' | 'COMPACT'>('COMFORTABLE')

  const API_PREFIX = '/stubbybutbetter'

  const fetcher = useMemo(() => async () => {
    const res = await fetch(`${API_PREFIX}/match-traces?limit=${limit}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch traces')
    return res.json() as Promise<MatchTrace[]>
  }, [limit])

  const { data: tracesRaw, loading, error, refresh } = usePolling(fetcher, 2000)

  const [methodFilter, setMethodFilter] = useState<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'>('ALL')
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL')
  const [pathFilter, setPathFilter] = useState<string>('')
  const [candidateFilter, setCandidateFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL')
  const [candidateMethodFilter, setCandidateMethodFilter] = useState<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'>('ALL')
  const [candidatePathFilter, setCandidatePathFilter] = useState<string>('')

  const traces = useMemo(() => {
    const list = (tracesRaw || [])
    const pf = (pathFilter || '').toLowerCase().trim()
    return list.filter(t => {
      const methodOk = methodFilter === 'ALL' || (t.request?.method?.toUpperCase() === methodFilter)
      const matched = !!t.selected
      const matchOk = matchFilter === 'ALL' || (matchFilter === 'MATCHED' ? matched : !matched)
      const pathOk = !pf || (String(t.request?.path || '').toLowerCase().includes(pf))
      return methodOk && matchOk && pathOk
    })
  }, [tracesRaw, methodFilter, matchFilter, pathFilter])

  async function clear () {
    await fetch(`${API_PREFIX}/match-traces/clear`, { method: 'POST' })
    await refresh()
    setSelected(null)
  }

  function escapeSingleQuotes (s: string) {
    return s.replace(/'/g, `'"'"'`)
  }

  function buildCurl (t: MatchTrace) {
    const method = (t.request?.method || 'GET').toUpperCase()
    const url = `http://localhost:8882${t.request?.url || ''}`
    const headers = t.request?.headers || {}
    const headerFlags = Object.keys(headers)
      .filter((k) => k.toLowerCase() !== 'host')
      .map((k) => `-H '${escapeSingleQuotes(k)}: ${escapeSingleQuotes(String(headers[k]))}'`)
      .join(' ')
    const hasBody = !!t.request?.bodyText
    const dataFlag = hasBody ? `--data-binary '${escapeSingleQuotes(String(t.request?.bodyText || ''))}'` : ''
    return [`curl -i -X ${method}`, headerFlags, dataFlag, `'${url}'`].filter(Boolean).join(' ')
  }

  async function copyCurl (t: MatchTrace) {
    const cmd = buildCurl(t)
    try {
      await navigator.clipboard.writeText(cmd)
      // no-op UI toast for now
    } catch (e) {
      // fallback
      window.prompt('Copy Request as cURL:', cmd)
    }
  }

  function highlightDiff (expected?: string, actual?: string) {
    const a = expected || ''
    const b = actual || ''
    if (a === b) {
      return { exp: <span>{a}</span>, act: <span>{b}</span> }
    }
    let start = 0
    while (start < a.length && start < b.length && a[start] === b[start]) start++
    let endA = a.length - 1
    let endB = b.length - 1
    while (endA >= start && endB >= start && a[endA] === b[endB]) { endA--; endB-- }
    const aPre = a.slice(0, start)
    const aDiff = a.slice(start, endA + 1)
    const aPost = a.slice(endA + 1)
    const bPre = b.slice(0, start)
    const bDiff = b.slice(start, endB + 1)
    const bPost = b.slice(endB + 1)
    const markStyle = { background: 'rgba(255, 255, 0, 0.35)' }
    return {
      exp: <span><span>{aPre}</span><mark style={markStyle}>{aDiff}</mark><span>{aPost}</span></span>,
      act: <span><span>{bPre}</span><mark style={markStyle}>{bDiff}</mark><span>{bPost}</span></span>
    }
  }

  const denseRowClass = density === 'COMPACT' ? 'text-xs' : ''

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Match Traces</h1>
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Limit
                <select className="btn" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Method
                <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as any)}>
                  <SelectTrigger aria-label="Method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['ALL','GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'] as const).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Matched
                <Select value={matchFilter} onValueChange={(v) => setMatchFilter(v as any)}>
                  <SelectTrigger aria-label="Matched"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['ALL','MATCHED','UNMATCHED'] as const).map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Path
                <input
                  className="h-9 px-2 py-1 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-100 placeholder-neutral-500"
                  type="text"
                  placeholder="contains…"
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                />
              </label>
              <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Density
                <Select value={density} onValueChange={(v) => setDensity(v as any)}>
                  <SelectTrigger aria-label="Density"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['COMFORTABLE', 'COMPACT'] as const).map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <Button onClick={() => { void refresh() }}>Refresh</Button>
                <Button onClick={() => { void clear() }}>Clear</Button>
                <Button variant="default" asChild>
                  <a href={`${API_PREFIX}/status`}>Status</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      <Card className="mb-3">
        <CardHeader className="flex items-center gap-3">
          <span>{loading ? 'Loading…' : 'Ready'}</span>
          {error && <span className="text-red-400">{error.message}</span>}
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stub</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Latency (ms)</TableHead>
                <TableHead>Candidates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(traces || []).map((t) => {
                const s = t.response?.status ?? ''
                const latency = t.timing?.respondedAt && t.timing?.receivedAt ? (t.timing.respondedAt - t.timing.receivedAt) : ''
                const selectedId = t.selected?.id ?? ''
                const order = (t.selected?.sourceOrder ?? '') as any
                return (
                  <TableRow key={t.id} className={`cursor-pointer hover:bg-neutral-800 ${denseRowClass}`} onClick={() => setSelected(t)}>
                    <TableCell>{new Date(t.timestamp).toLocaleTimeString()}</TableCell>
                    <TableCell>{t.request?.method}</TableCell>
                    <TableCell className="truncate max-w-[420px]" title={t.request?.path}>{t.request?.path}</TableCell>
                    <TableCell>{String(s)}</TableCell>
                    <TableCell>{String(selectedId)}</TableCell>
                    <TableCell>{String(order)}</TableCell>
                    <TableCell>{String(latency)}</TableCell>
                    <TableCell>{String(t.candidates?.length || 0)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between w-full">
              <div className="text-sm md:text-base">Trace {selected.id}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => { void copyCurl(selected) }}>Copy Request as cURL</Button>
                <Button size="icon" aria-label="Close" className="text-neutral-300 hover:text-neutral-100" onClick={() => setSelected(null)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-400 mb-2">
                  {selected.request?.bodyTruncated ? '(request body truncated)' : ''}
                </div>
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="request-full">
                    <AccordionTrigger>Request</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap text-xs bg-neutral-950 p-2 rounded border border-neutral-800 overflow-auto">
                        {selected.request ? JSON.stringify(selected.request, null, 2) : '(empty)'}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="response-full">
                    <AccordionTrigger>Response</AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap text-xs bg-neutral-950 p-2 rounded border border-neutral-800 overflow-auto">
                        {selected.response ? JSON.stringify(selected.response, null, 2) : '(empty)'}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Candidates
                    <Select value={candidateFilter} onValueChange={(v) => setCandidateFilter(v as any)}>
                      <SelectTrigger aria-label="Candidates"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['ALL','MATCHED','UNMATCHED'] as const).map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Method
                    <Select value={candidateMethodFilter} onValueChange={(v) => setCandidateMethodFilter(v as any)}>
                      <SelectTrigger aria-label="Candidate Method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['ALL','GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'] as const).map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="inline-flex items-center gap-2 font-medium text-sm mr-2">Path
                    <input
                      className="h-9 px-2 py-1 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-100 placeholder-neutral-500"
                      type="text"
                      placeholder="stub regex contains…"
                      value={candidatePathFilter}
                      onChange={(e) => setCandidatePathFilter(e.target.value)}
                    />
                  </label>
                </div>
                <Accordion type="multiple" className="space-y-2">
                  {((selected.candidates || []).filter(c => {
                    // Matched/Unmatched filter
                    const isMatch = !!c.summary?.allPassed
                    const matchOk = candidateFilter === 'ALL' || (candidateFilter === 'MATCHED' ? isMatch : !isMatch)

                    // Method filter based on the stub's expected method(s) from checks
                    let methodOk = true
                    if (candidateMethodFilter !== 'ALL') {
                      const mcheck = (c.checks || []).find(ch => ch.field === 'method') as any
                      const expected = (mcheck && typeof mcheck.expected === 'string') ? mcheck.expected.toUpperCase() : ''
                      const set = expected.split(',').map(s => s.trim())
                      methodOk = set.includes(candidateMethodFilter)
                    }

                    // Path filter based on the stub's url regex expected value
                    let pathOk = true
                    const pf = (candidatePathFilter || '').toLowerCase().trim()
                    if (pf) {
                      const ucheck = (c.checks || []).find(ch => ch.field === 'url') as any
                      const expectedUrl = (ucheck && typeof ucheck.expected === 'string') ? ucheck.expected.toLowerCase() : ''
                      pathOk = expectedUrl.includes(pf)
                    }

                    return matchOk && methodOk && pathOk
                  })).map((c, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 w-full">
                          <div className="inline-flex items-center gap-2">
                            <ChevronRightIcon className="h-4 w-4 text-neutral-400 transition-transform group-data-[state=open]:rotate-90" />
                            <span>Stub {String(c.id)} [{c.source?.file}:{c.source?.lineStart}-{c.source?.lineEnd}]</span>
                            <Badge variant={c.summary?.allPassed ? 'default' : 'destructive'}>
                              {c.summary?.allPassed ? 'MATCH' : 'MISS'}
                            </Badge>
                            {c.summary?.firstFail && (
                              <span className="text-xs text-neutral-400">{c.summary.firstFail.field}: {c.summary.firstFail.reason}</span>
                            )}
                          </div>
                          <a className="ml-auto text-neutral-400 hover:text-sky-400" href={`${API_PREFIX}/${c.id}`} target="_blank" rel="noreferrer" title="Open stub details">
                            <LinkIcon className="h-4 w-4" />
                          </a>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1 text-xs">
                          {(c.checks || []).map((ch, i) => {
                            const d = highlightDiff(ch.expected, ch.actual)
                            return (
                              <div key={i} className="grid grid-cols-5 gap-2 items-start">
                                <div className="col-span-1 text-neutral-300">{ch.field}</div>
                                <div className="col-span-2 overflow-auto">
                                  <div><span className="text-neutral-400 mr-1">expected:</span>{d.exp}</div>
                                  <div><span className="text-neutral-400 mr-1">actual:</span>{d.act}</div>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                  <Badge variant={ch.matched ? 'default' : 'destructive'}>{ch.matched ? 'MATCH' : 'MISS'}</Badge>
                                  {ch.reason && <span className="text-neutral-400">{ch.reason}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}