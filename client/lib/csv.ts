export type CsvRow = Record<string, string>

function splitCsvLine(line: string) {
  const out: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      out.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  out.push(current.trim())
  return out
}

export function parseCsv(text: string) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.replace(/^"|"$/g, '').trim()
  )

  const rows: CsvRow[] = []
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line).map((c) => c.replace(/^"|"$/g, '').trim())
    const row: CsvRow = {}
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cols[i] ?? ''
    rows.push(row)
  }

  return rows
}

