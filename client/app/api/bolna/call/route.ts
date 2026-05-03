import { bolnaCall } from '@/lib/bolna'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      invoice_id: string
      recipient_phone_number?: string
      scheduled_at?: string
      user_data?: Record<string, unknown>
    }

    if (!body?.invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 })
    }

    const agentId = process.env.BOLNA_AGENT_ID || 'f8072574-670c-4411-9892-9be5eca25133'
    const fromPhone = process.env.BOLNA_FROM_PHONE_NUMBER || '+919079257904'
    if (!fromPhone) {
      return Response.json(
        { error: 'Missing BOLNA_FROM_PHONE_NUMBER' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()
    const invoiceRes = await supabase
      .from('invoices')
      .select('*')
      .eq('id', body.invoice_id)
      .single()

    if (invoiceRes.error) {
      return Response.json({ error: invoiceRes.error.message }, { status: 400 })
    }

    // Use provided phone override, else invoice.phone.
    const recipientPhone =
      body.recipient_phone_number || (invoiceRes.data as { phone?: string }).phone
    if (!recipientPhone) {
      return Response.json(
        { error: 'recipient_phone_number missing and invoice has no phone' },
        { status: 400 }
      )
    }

    const bolnaRes = await bolnaCall({
      agent_id: agentId,
      recipient_phone_number: recipientPhone,
      from_phone_number: fromPhone,
      scheduled_at: body.scheduled_at,
      user_data: {
        invoice_id: body.invoice_id,
        client_name: (invoiceRes.data as { client_name?: string }).client_name,
        amount: (invoiceRes.data as { amount?: unknown }).amount,
        due_date: (invoiceRes.data as { due_date?: unknown }).due_date,
        ...(body.user_data || {}),
      },
    })

    // Best-effort to pick an execution id from unknown response shape.
    const execution_id =
      typeof bolnaRes === 'object' && bolnaRes
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((bolnaRes as any).execution_id ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (bolnaRes as any).executionId ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (bolnaRes as any).id ||
            null)
        : null

    // Store initiation in call_logs (schema doesn't include execution_id, so we stash in summary).
    await supabase.from('call_logs').insert({
      invoice_id: body.invoice_id,
      call_status: 'initiated',
      summary: execution_id ? `execution_id:${execution_id}` : 'initiated',
      transcript: JSON.stringify(bolnaRes),
    })

    return Response.json({ ok: true, execution_id, bolna: bolnaRes })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

