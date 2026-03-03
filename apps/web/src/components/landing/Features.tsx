import { Brain, GitBranch, BarChart3, MessageSquare, Plug, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Integration',
    description:
      'Claude AI guides you through every step, from connecting data to building dashboards.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: GitBranch,
    title: 'Visual Pipeline Builder',
    description:
      'Drag-and-drop data flows that anyone can understand and modify.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: BarChart3,
    title: 'Instant Dashboards',
    description:
      'Beautiful, interactive charts generated automatically from your data.',
    color: 'bg-violet-500/10 text-violet-500',
  },
  {
    icon: MessageSquare,
    title: 'Natural Language Queries',
    description:
      'Ask questions about your data in plain English. Get answers instantly.',
    color: 'bg-amber-500/10 text-amber-500',
  },
  {
    icon: Plug,
    title: '200+ Connectors',
    description:
      'Connect to databases, APIs, SaaS tools, and file formats.',
    color: 'bg-rose-500/10 text-rose-500',
  },
  {
    icon: Shield,
    title: 'Enterprise Ready',
    description:
      'SOC2 compliant, RBAC, audit logs, and data encryption.',
    color: 'bg-sky-500/10 text-sky-500',
  },
] as const

export default function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to work with data
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            From ingestion to insight, DAI handles the full data lifecycle with
            AI-powered automation at every step.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={cn(
                  'group relative rounded-2xl border border-border bg-background p-8',
                  'transition-all duration-300',
                  'hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5',
                  'hover:border-primary/20'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl',
                    feature.color
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
