import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
      {/* Background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
            backgroundSize: '4rem 4rem',
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            Now with Claude AI integration
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Turn Raw Data Into
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Intelligence
            </span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Connect any data source. Transform with AI. Build beautiful
            dashboards&nbsp;&mdash; no code required.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/wizard"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Start Building
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-8 py-3.5 text-base font-semibold text-foreground transition-all duration-200 hover:bg-secondary hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4 text-muted-foreground" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Browser mockup */}
        <div className="mx-auto mt-20 max-w-5xl">
          <div className="rounded-2xl border border-border bg-background shadow-2xl shadow-black/10 overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="ml-3 flex-1">
                <div className="mx-auto max-w-sm rounded-md bg-background border border-border px-4 py-1 text-xs text-muted-foreground text-center">
                  app.dai-platform.io/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard content simulation */}
            <div className="bg-secondary/30 p-6">
              {/* Top stat cards */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Revenue', value: '$48.2K', color: 'bg-primary', pct: 78 },
                  { label: 'Users', value: '12,847', color: 'bg-accent', pct: 65 },
                  { label: 'Pipelines', value: '34', color: 'bg-violet-500', pct: 85 },
                  { label: 'Uptime', value: '99.9%', color: 'bg-amber-500', pct: 92 },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="mt-1 text-lg font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className={`mt-2 h-1.5 w-full rounded-full ${stat.color}/10`}>
                      <div
                        className={`h-full rounded-full ${stat.color}`}
                        style={{ width: `${stat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Main chart */}
                <div className="rounded-lg border border-border bg-background p-4 sm:col-span-2">
                  <div className="mb-3 text-sm font-medium text-foreground">
                    Data Flow Activity
                  </div>
                  <div className="flex h-32 items-end gap-1.5">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-primary to-primary/60 transition-all duration-500"
                          style={{ height: `${h}%` }}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Side panel */}
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3 text-sm font-medium text-foreground">
                    Sources
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'PostgreSQL', pct: 45, color: 'bg-primary' },
                      { name: 'REST API', pct: 30, color: 'bg-accent' },
                      { name: 'CSV Import', pct: 25, color: 'bg-violet-500' },
                    ].map((src) => (
                      <div key={src.name}>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{src.name}</span>
                          <span>{src.pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${src.color}`}
                            style={{ width: `${src.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
