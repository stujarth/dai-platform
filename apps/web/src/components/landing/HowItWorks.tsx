import { Upload, Wand2, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  {
    number: 1,
    icon: Upload,
    title: 'Connect',
    description: 'Upload CSV or connect your database. AI auto-detects schema.',
    color: 'bg-primary text-primary-foreground',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    number: 2,
    icon: Wand2,
    title: 'Transform',
    description:
      'Clean, join, and aggregate with AI-powered suggestions.',
    color: 'bg-accent text-accent-foreground',
    iconBg: 'bg-accent/10 text-accent',
  },
  {
    number: 3,
    icon: BarChart3,
    title: 'Visualize',
    description:
      'Instant dashboards and reports. Share with your team.',
    color: 'bg-violet-500 text-white',
    iconBg: 'bg-violet-500/10 text-violet-500',
  },
] as const

export default function HowItWorks() {
  return (
    <section className="relative bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three steps to data intelligence
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Go from raw data to actionable insights in minutes, not months.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {/* Connecting dashed line (desktop only) */}
            <div
              className="pointer-events-none absolute top-16 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] hidden md:block"
              aria-hidden="true"
            >
              <div className="h-px w-full border-t-2 border-dashed border-border" />
              {/* Arrows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="h-2 w-2 rotate-45 border-t-2 border-r-2 border-primary/40" />
              </div>
              <div className="absolute top-1/2 left-[15%] -translate-y-1/2">
                <div className="h-2 w-2 rotate-45 border-t-2 border-r-2 border-primary/40" />
              </div>
              <div className="absolute top-1/2 right-[15%] -translate-y-1/2">
                <div className="h-2 w-2 rotate-45 border-t-2 border-r-2 border-primary/40" />
              </div>
            </div>

            {steps.map((step) => {
              const Icon = step.icon
              return (
                <div
                  key={step.title}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number circle */}
                  <div
                    className={cn(
                      'relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shadow-lg',
                      step.color
                    )}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className={cn(
                      'mt-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl',
                      step.iconBg
                    )}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  {/* Title */}
                  <h3 className="mt-4 text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
