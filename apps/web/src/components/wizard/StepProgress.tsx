// ---------------------------------------------------------------------------
// DAI Platform – Step Progress Indicator
// ---------------------------------------------------------------------------
// Horizontal 5-step progress bar with circles connected by lines.
// States: completed (green checkmark), active (blue ring + pulse), upcoming (gray).
// Clicking a completed step navigates back to that step.
// ---------------------------------------------------------------------------

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWizardStore } from '@/stores/wizard-store'

const STEPS = [
  { number: 1, label: 'Select Source' },
  { number: 2, label: 'Configure' },
  { number: 3, label: 'Preview' },
  { number: 4, label: 'Transform' },
  { number: 5, label: 'Report' },
] as const

export default function StepProgress() {
  const { currentStep, completedSteps, setStep } = useWizardStore()

  function handleStepClick(step: number) {
    if (completedSteps.includes(step)) {
      setStep(step)
    }
  }

  return (
    <nav aria-label="Wizard progress" className="w-full px-4 py-6">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number)
          const isActive = currentStep === step.number
          const isClickable = isCompleted

          return (
            <li
              key={step.number}
              className="flex flex-1 items-center last:flex-none"
            >
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => handleStepClick(step.number)}
                disabled={!isClickable}
                className={cn(
                  'group flex flex-col items-center gap-2',
                  isClickable && 'cursor-pointer',
                  !isClickable && !isActive && 'cursor-default',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {/* Circle */}
                <span
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
                    isCompleted &&
                      'border-emerald-500 bg-emerald-500 text-white',
                    isActive &&
                      'border-blue-600 bg-blue-50 text-blue-600',
                    !isCompleted &&
                      !isActive &&
                      'border-gray-300 bg-white text-gray-400',
                    isClickable &&
                      'group-hover:shadow-md group-hover:scale-105',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}

                  {/* Pulse ring for active step */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30" />
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    isCompleted && 'text-emerald-600',
                    isActive && 'text-blue-600',
                    !isCompleted && !isActive && 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 sm:mx-4">
                  <div
                    className={cn(
                      'h-full rounded-full transition-colors duration-300',
                      completedSteps.includes(step.number)
                        ? 'bg-emerald-400'
                        : 'bg-gray-200',
                    )}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
