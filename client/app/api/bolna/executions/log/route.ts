import { bolnaExecutionLog } from '@/lib/bolna'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { invoice_id: string; execution_id: string }
    if (!body?.invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 })
    }
    if (!body?.execution_id) {
      return Response.json({ error: 'execution_id is required' }, { status: 400 })
    }

    const log = await bolnaExecutionLog(body.execution_id)

    const supabase = getSupabaseAdmin()
    const insertRes = await supabase.from('call_logs').insert({
      invoice_id: body.invoice_id,
      call_status: 'log',
      summary: `execution_id:${body.execution_id}`,
      transcript: JSON.stringify(log),
    })

    if (insertRes.error) {
      return Response.json({ error: insertRes.error.message }, { status: 400 })
    }

    return Response.json({ ok: true, execution_id: body.execution_id, log })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

