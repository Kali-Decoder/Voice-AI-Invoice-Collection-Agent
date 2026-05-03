export type BolnaCallRequest = {
  agent_id: string
  recipient_phone_number: string
  from_phone_number: string
  scheduled_at?: string
  user_data?: Record<string, unknown>
  agent_data?: Record<string, unknown>
}

export async function bolnaCall(payload: BolnaCallRequest) {
  const token = process.env.BOLNA_API_TOKEN
  if (!token) throw new Error('Missing BOLNA_API_TOKEN')

  const res = await fetch('https://api.bolna.ai/call', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    throw new Error(
      `Bolna call failed (${res.status}): ${
        typeof json === 'object' && json && 'message' in json
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (json as any).message
          : text
      }`
    )
  }

  return json
}

export async function bolnaExecutionLog(executionId: string) {
  const token = process.env.BOLNA_API_TOKEN
  if (!token) throw new Error('Missing BOLNA_API_TOKEN')

  const res = await fetch(
    `https://api.bolna.ai/executions/${encodeURIComponent(executionId)}/log`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    throw new Error(
      `Bolna log failed (${res.status}): ${
        typeof json === 'object' && json && 'message' in json
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (json as any).message
          : text
      }`
    )
  }

  return json
}

