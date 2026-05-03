'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { parseCsv } from '@/lib/csv'
import { rowsToInvoices, type NewInvoiceInput } from '@/lib/invoices'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Invoice = {
  id: string
  client_name: string | null
  phone: string | null
  amount: number | string | null
  due_date: string | null
  status: string | null
}

type CallLog = {
  id: string
  call_status: string | null
  transcript: string | null
  summary: string | null
  created_at: string | null
}

type Commitment = {
  id: string
  promised_date: string | null
  created_at: string | null
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [manual, setManual] = useState<NewInvoiceInput>({
    client_name: '',
    phone: '',
    amount: 0,
    due_date: '',
  })
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [activityError, setActivityError] = useState<string | null>(null)
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const [callActionError, setCallActionError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    promised: 0,
    paid: 0,
    amount_pending: 0,
  })

  const refreshAll = async () => {
    await fetchInvoices()
  }

  const fetchInvoices = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setError(
          'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        )
        setInvoices([])
        setSelectedInvoiceId(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('due_date', { ascending: true })
      if (error) {
        setError(error.message)
        setInvoices([])
        setSelectedInvoiceId(null)
        setIsLoading(false)
        return
      }

      const list = (data as Invoice[]) || []
      setInvoices(list)
      const nextSelectedId =
        list.find((i) => i.id === selectedInvoiceId)?.id ?? list[0]?.id ?? null
      setSelectedInvoiceId(nextSelectedId)
      await fetchActivity(nextSelectedId)

      const total = list.length
      const pending = list.filter((i) => (i.status ?? 'pending') === 'pending')
      const promised = list.filter((i) => (i.status ?? '') === 'promised')
      const paid = list.filter((i) => (i.status ?? '') === 'paid')
      const amount_pending = pending.reduce((sum, i) => {
        const n = typeof i.amount === 'number' ? i.amount : Number(i.amount)
        return sum + (Number.isFinite(n) ? n : 0)
      }, 0)

      setMetrics({
        total,
        pending: pending.length,
        promised: promised.length,
        paid: paid.length,
        amount_pending,
      })
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setInvoices([])
      setSelectedInvoiceId(null)
      setIsLoading(false)
    }
  }

  const fetchActivity = async (invoiceId?: string | null) => {
    setActivityError(null)
    setIsLoadingActivity(true)

    try {
      const id = invoiceId ?? selectedInvoiceId
      if (!id) {
        setCallLogs([])
        setCommitments([])
        setIsLoadingActivity(false)
        return
      }

      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setCallLogs([])
        setCommitments([])
        setIsLoadingActivity(false)
        return
      }

      const [logsRes, commitmentsRes] = await Promise.all([
        supabase
          .from('call_logs')
          .select('*')
          .eq('invoice_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('commitments')
          .select('*')
          .eq('invoice_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (logsRes.error) throw new Error(logsRes.error.message)
      if (commitmentsRes.error) throw new Error(commitmentsRes.error.message)

      setCallLogs((logsRes.data as CallLog[]) || [])
      setCommitments((commitmentsRes.data as Commitment[]) || [])
      setIsLoadingActivity(false)
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load activity')
      setCallLogs([])
      setCommitments([])
      setIsLoadingActivity(false)
    }
  }

  useEffect(() => {
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadCsv = async (file: File) => {
    setUploadError(null)
    setIsUploading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setUploadError(
          'Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first.'
        )
        setIsUploading(false)
        return
      }

      const text = await file.text()
      const rows = parseCsv(text)
      const invoices = rowsToInvoices(rows)
      if (invoices.length === 0) {
        setUploadError(
          'No valid rows found. Expected headers like client_name, phone, amount, due_date.'
        )
        setIsUploading(false)
        return
      }

      const { error } = await supabase.from('invoices').insert(invoices)
      if (error) {
        setUploadError(error.message)
        setIsUploading(false)
        return
      }

      await refreshAll()
      setIsUploading(false)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setIsUploading(false)
    }
  }

  const createManualInvoice = async () => {
    setUploadError(null)
    setIsUploading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setUploadError(
          'Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local first.'
        )
        setIsUploading(false)
        return
      }

      if (
        !manual.client_name.trim() ||
        !manual.phone.trim() ||
        !manual.due_date.trim() ||
        !Number.isFinite(Number(manual.amount))
      ) {
        setUploadError('Fill client name, phone, amount, and due date.')
        setIsUploading(false)
        return
      }

      const payload: NewInvoiceInput = {
        client_name: manual.client_name.trim(),
        phone: manual.phone.trim(),
        amount: Number(manual.amount),
        due_date: manual.due_date.trim(),
      }

      const { error } = await supabase.from('invoices').insert(payload)
      if (error) {
        setUploadError(error.message)
        setIsUploading(false)
        return
      }

      setManual({ client_name: '', phone: '', amount: 0, due_date: '' })
      await refreshAll()
      setIsUploading(false)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Create failed')
      setIsUploading(false)
    }
  }

  const selected = invoices.find((i) => i.id === selectedInvoiceId) || null
  const latestLog = callLogs[0] || null
  const latestExecutionId =
    latestLog?.summary?.startsWith('execution_id:')
      ? latestLog.summary.slice('execution_id:'.length).trim()
      : null

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Voice AI Invoice Collection</h1>
            <p className="text-sm text-zinc-600 mt-1">
              Upload unpaid invoices → agent calls clients → commitments get logged → recovery improves.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            <Button variant="outline" onClick={refreshAll}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500">Total invoices</p>
              <p className="text-2xl font-semibold mt-1">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500">Pending</p>
              <p className="text-2xl font-semibold mt-1">{metrics.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500">Promised</p>
              <p className="text-2xl font-semibold mt-1">{metrics.promised}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500">Paid</p>
              <p className="text-2xl font-semibold mt-1">{metrics.paid}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-zinc-500">Pending amount</p>
              <p className="text-2xl font-semibold mt-1">
                ₹ {metrics.amount_pending.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Card className="mb-6">
            <CardContent className="p-4">
            <p className="text-red-600 text-sm">Error: {error}</p>
            <p className="text-xs text-zinc-600 mt-2">
              Create `client/.env.local` with Supabase keys (see `client/.env.example`), then restart `npm run dev`.
            </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Invoices</h2>
                <span className="text-xs text-zinc-500">
                  Click an invoice to view details
                </span>
              </div>

              {isLoading && <p className="text-sm">Loading...</p>}
              {!isLoading && !error && invoices.length === 0 && (
                <p className="text-sm text-zinc-600">
                  No invoices yet. Upload a CSV or add one manually.
                </p>
              )}

              <div className="divide-y">
                {invoices.map((inv) => {
                  const status = inv.status ?? 'pending'
                  const isSelected = inv.id === selectedInvoiceId
                  const statusVariant =
                    status === 'paid'
                      ? 'success'
                      : status === 'promised'
                        ? 'warning'
                        : 'secondary'
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => {
                        setSelectedInvoiceId(inv.id)
                        void fetchActivity(inv.id)
                      }}
                      className={[
                        'w-full text-left py-3 px-2 rounded-lg transition-colors',
                        isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{inv.client_name || 'Unknown client'}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {inv.phone || '—'} · Due {inv.due_date || '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹ {inv.amount ?? '—'}</p>
                          <div className="mt-1 flex justify-end">
                            <Badge variant={statusVariant}>Status: {status}</Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
              <h2 className="font-semibold mb-3">Upload invoices (CSV)</h2>
              <p className="text-xs text-zinc-600 mb-3">
                Headers supported: <span className="font-mono">client_name, phone, amount, due_date</span>
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadCsv(file)
                  e.target.value = ''
                }}
              />
              {uploadError && <p className="text-sm text-red-600 mt-3">{uploadError}</p>}
              {isUploading && <p className="text-sm mt-3">Working...</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
              <h2 className="font-semibold mb-3">Add invoice (manual)</h2>
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm">
                  <span className="text-xs text-zinc-600">Client name</span>
                  <Input
                    className="mt-1"
                    value={manual.client_name}
                    onChange={(e) => setManual((m) => ({ ...m, client_name: e.target.value }))}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-zinc-600">Phone</span>
                  <Input
                    className="mt-1"
                    value={manual.phone}
                    onChange={(e) => setManual((m) => ({ ...m, phone: e.target.value }))}
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="text-xs text-zinc-600">Amount</span>
                    <Input
                      type="number"
                      className="mt-1"
                      value={manual.amount}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, amount: Number(e.target.value) }))
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-xs text-zinc-600">Due date</span>
                    <Input
                      type="date"
                      className="mt-1"
                      value={manual.due_date}
                      onChange={(e) => setManual((m) => ({ ...m, due_date: e.target.value }))}
                    />
                  </label>
                </div>
                <Button type="button" disabled={isUploading} onClick={() => void createManualInvoice()}>
                  Add invoice
                </Button>
              </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
              <h2 className="font-semibold mb-2">Selected invoice</h2>
              {!selected && <p className="text-sm text-zinc-600">Select an invoice to view.</p>}
              {selected && (
                <div className="text-sm">
                  <p className="font-medium">{selected.client_name || 'Unknown client'}</p>
                  <p className="text-zinc-600 mt-1">{selected.phone || '—'}</p>
                  <p className="text-zinc-600 mt-1">
                    Amount: ₹ {selected.amount ?? '—'} · Due: {selected.due_date || '—'}
                  </p>
                  <p className="text-zinc-600 mt-1">
                    Status: {selected.status ?? 'pending'}
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      disabled={isCalling || !selectedInvoiceId}
                      onClick={async () => {
                        if (!selectedInvoiceId) return
                        setCallActionError(null)
                        setIsCalling(true)
                        try {
                          const res = await fetch('/api/bolna/call', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ invoice_id: selectedInvoiceId }),
                          })
                          const json = (await res.json()) as { ok?: boolean; error?: string }
                          if (!res.ok || !json.ok) {
                            throw new Error(json.error || 'Failed to start call')
                          }
                          await refreshAll()
                        } catch (err) {
                          setCallActionError(
                            err instanceof Error ? err.message : 'Failed to start call'
                          )
                        } finally {
                          setIsCalling(false)
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      {isCalling ? 'Starting call…' : 'Start Call'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!latestExecutionId || !selectedInvoiceId}
                      onClick={async () => {
                        if (!selectedInvoiceId || !latestExecutionId) return
                        setCallActionError(null)
                        setIsCalling(true)
                        try {
                          const res = await fetch('/api/bolna/executions/log', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              invoice_id: selectedInvoiceId,
                              execution_id: latestExecutionId,
                            }),
                          })
                          const json = (await res.json()) as { ok?: boolean; error?: string }
                          if (!res.ok || !json.ok) {
                            throw new Error(json.error || 'Failed to fetch execution log')
                          }
                          await fetchActivity(selectedInvoiceId)
                        } catch (err) {
                          setCallActionError(
                            err instanceof Error ? err.message : 'Failed to fetch execution log'
                          )
                        } finally {
                          setIsCalling(false)
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      Fetch Execution Log
                    </Button>
                  </div>
                  {latestExecutionId && (
                    <p className="text-xs text-zinc-500 mt-2">
                      Latest execution id: <span className="font-mono">{latestExecutionId}</span>
                    </p>
                  )}
                  {callActionError && (
                    <p className="text-sm text-red-600 mt-2">{callActionError}</p>
                  )}
                </div>
              )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Activity</h2>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => void fetchActivity(selectedInvoiceId)}
                >
                  Reload
                </Button>
              </div>

              {!selected && (
                <p className="text-sm text-zinc-600">
                  Select an invoice to see call logs and payment commitments.
                </p>
              )}

              {selected && (
                <div className="space-y-4">
                  {isLoadingActivity && <p className="text-sm">Loading...</p>}
                  {activityError && (
                    <p className="text-sm text-red-600">Error: {activityError}</p>
                  )}

                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Latest call</p>
                    {!latestLog && (
                      <div className="p-3 rounded-lg bg-zinc-50 border text-sm text-zinc-600">
                        No calls logged yet.
                      </div>
                    )}
                    {latestLog && (
                      <div className="p-3 rounded-lg bg-zinc-50 border">
                        <p className="text-sm font-medium">
                          Status: {latestLog.call_status ?? '—'}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {latestLog.created_at
                            ? new Date(latestLog.created_at).toLocaleString()
                            : '—'}
                        </p>
                        {latestLog.summary && (
                          <p className="text-sm text-zinc-700 mt-2">
                            {latestLog.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Commitments</p>
                    {commitments.length === 0 && (
                      <div className="p-3 rounded-lg bg-zinc-50 border text-sm text-zinc-600">
                        No commitments logged yet.
                      </div>
                    )}
                    {commitments.length > 0 && (
                      <div className="divide-y border rounded-lg overflow-hidden">
                        {commitments.map((c) => (
                          <div key={c.id} className="p-3 bg-white">
                            <p className="text-sm font-medium">
                              Promised date: {c.promised_date ?? '—'}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              Logged{' '}
                              {c.created_at
                                ? new Date(c.created_at).toLocaleString()
                                : '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 border">
                    <p className="text-xs text-zinc-600">
                      Next: connect the “Agent call” webhook to insert into{' '}
                      <span className="font-mono">call_logs</span> and{' '}
                      <span className="font-mono">commitments</span>, and update invoice{' '}
                      <span className="font-mono">status</span> to <span className="font-mono">promised</span> /{' '}
                      <span className="font-mono">paid</span>.
                    </p>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
