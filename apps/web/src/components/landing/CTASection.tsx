import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-foreground py-24 sm:py-32">
      {/* Decorative gradient blurs */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl lg:text-5xl">
          Ready to transform your data?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-background/60">
          Get started in minutes. No credit card required.
        </p>
        <div className="mt-10">
          <Link
            to="/wizard"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <p className="mt-6 text-sm text-background/40">
          Free tier includes 5 pipelines and 100K rows per month
        </p>
      </div>
    </section>
  )
}
