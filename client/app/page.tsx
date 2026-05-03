import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Voice AI Invoice Collection Agent
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">
              Recover pending payments faster.
            </h1>
            <p className="text-zinc-600 mt-3 max-w-2xl">
              Upload unpaid invoices. The agent calls clients to remind payment, confirms a date, and logs commitments so your dashboard stays updated.
            </p>
          </div>
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <Card>
            <CardContent>
              <p className="text-sm font-semibold">1) Upload invoices</p>
              <p className="text-sm text-zinc-600 mt-2">
                Add invoices via CSV or manual entry (client, phone, amount, due date).
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold">2) Agent calls clients</p>
              <p className="text-sm text-zinc-600 mt-2">
                Reminds them of the due amount and records the outcome + summary.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-semibold">3) Track commitments</p>
              <p className="text-sm text-zinc-600 mt-2">
                Promised dates are logged and shown next to each invoice.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold">Success metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="p-4 rounded-xl border bg-zinc-50">
                  <p className="text-zinc-500 text-xs">Recovery rate</p>
                  <p className="mt-1 font-semibold">% payments recovered</p>
                </div>
                <div className="p-4 rounded-xl border bg-zinc-50">
                  <p className="text-zinc-500 text-xs">Speed</p>
                  <p className="mt-1 font-semibold">Avg collection time</p>
                </div>
                <div className="p-4 rounded-xl border bg-zinc-50">
                  <p className="text-zinc-500 text-xs">Reliability</p>
                  <p className="mt-1 font-semibold">Call completion rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="mt-10 text-xs text-zinc-500">
          Tip: set Supabase keys in <span className="font-mono">client/.env.local</span> to enable the dashboard.
        </footer>
      </div>
    </div>
  );
}
