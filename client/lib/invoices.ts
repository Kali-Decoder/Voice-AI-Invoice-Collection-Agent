import type { CsvRow } from '@/lib/csv'

export type NewInvoiceInput = {
  client_name: string
  phone: string
  amount: number
  due_date: string // YYYY-MM-DD
  status?: string
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '').trim()
}

function parseAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

export function rowsToInvoices(rows: CsvRow[]) {
  const invoices: NewInvoiceInput[] = []

  for (const row of rows) {
    const client_name =
      row.client_name || row.client || row.name || row.customer || ''
    const phone = row.phone || row.mobile || row.phone_number || row.contact || ''
    const amountRaw = row.amount || row.total || row.balance || row.due_amount || ''
    const due_date = row.due_date || row.due || row.due_on || row.date || ''

    const amount = parseAmount(amountRaw)
    if (!client_name || !phone || !due_date || !Number.isFinite(amount)) continue

    invoices.push({
      client_name: client_name.trim(),
      phone: normalizePhone(phone),
      amount,
      due_date: due_date.trim(),
      status: row.status?.trim() || undefined,
    })
  }

  return invoices
}

