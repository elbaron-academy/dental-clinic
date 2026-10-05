import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, useUser } from '../auth/context'

const TOUR_KEY = 'dental-clinic.product-tour.v1'

type TourStatus = 'new' | 'active' | 'paused' | 'skipped' | 'done'

interface TourState {
  status: TourStatus
  step: number
}

interface TourStep {
  target: string
  title: string
  body: string
}

const DEFAULT_STATE: TourState = { status: 'new', step: 0 }

function readTourState(): TourState {
  try {
    const value = localStorage.getItem(TOUR_KEY)
    if (!value) return DEFAULT_STATE
    const parsed = JSON.parse(value) as Partial<TourState>
    if (!parsed.status || typeof parsed.step !== 'number') return DEFAULT_STATE
    return { status: parsed.status, step: Math.max(0, parsed.step) }
  } catch {
    return DEFAULT_STATE
  }
}

function saveTourState(state: TourState) {
  localStorage.setItem(TOUR_KEY, JSON.stringify(state))
}

export function ProductTour() {
  const { hasPerm } = useAuth()
  const user = useUser()
  const location = useLocation()
  const [state, setState] = useState<TourState>(() => readTourState())

  const steps = useMemo<TourStep[]>(() => {
    const items: TourStep[] = [
      {
        target: '[data-tour="brand"]',
        title: 'Clinic workspace',
        body: `You are signed in to ${user.clinic.name}. The home link always returns you to your role dashboard.`,
      },
      {
        target: '[data-tour="nav"]',
        title: 'Main navigation',
        body: 'Use these tabs to move between the sections your account can access.',
      },
      {
        target: '[data-tour="user-menu"]',
        title: 'Your session',
        body: 'Install the PWA when available, check your role, or log out from this area.',
      },
    ]

    if (hasPerm('patients.view_patient')) {
      items.splice(2, 0, {
        target: '[data-tour="nav-patients"]',
        title: 'Patients',
        body: 'Find patient records, review visit history, and register new patients when your role allows it.',
      })
    }

    if (hasPerm('appointments.view_appointment')) {
      items.splice(3, 0, {
        target: '[data-tour="nav-appointments"]',
        title: 'Appointments',
        body: 'Open the appointment schedule to manage booking, check-in, and appointment details.',
      })
    }

    return items
  }, [hasPerm, user.clinic.name])

  const activeStep = steps[Math.min(state.step, steps.length - 1)]
  const isActive = state.status === 'active'
  const isPaused = state.status === 'paused'
  const isFinished = state.status === 'skipped' || state.status === 'done'
  const canStart = state.status === 'new'

  useEffect(() => {
    saveTourState(state)
  }, [state])


  useEffect(() => {
    if (!isActive || !activeStep) return
    const target = document.querySelector(activeStep.target)
    if (target && 'scrollIntoView' in target) {
      target.scrollIntoView({ block: 'center', inline: 'center' })
    }
  }, [activeStep, isActive, location.pathname])

  const start = () => setState({ status: 'active', step: Math.min(state.step, steps.length - 1) })
  const pause = () => setState((current) => ({ ...current, status: 'paused' }))
  const skip = () => setState((current) => ({ ...current, status: 'skipped' }))
  const back = () => setState((current) => ({ status: 'active', step: Math.max(0, current.step - 1) }))
  const next = () =>
    setState((current) =>
      current.step >= steps.length - 1 ? { status: 'done', step: current.step } : { status: 'active', step: current.step + 1 },
    )

  if (isFinished) {
    return (
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setState({ status: 'active', step: 0 })}>
        Tour
      </button>
    )
  }

  return (
    <div className="product-tour">
      {!isActive && (
        <button type="button" className="btn btn-secondary btn-small" onClick={start}>
          {isPaused ? 'Continue tour' : 'Start tour'}
        </button>
      )}
      {(canStart || isPaused) && (
        <button type="button" className="btn btn-ghost btn-small" onClick={skip}>
          Skip
        </button>
      )}
      {isActive && activeStep && (
        <>
          <div className="tour-scrim" aria-hidden="true" />
          <section className="tour-card" aria-live="polite" aria-label="Product tour">
            <div className="tour-progress">
              Step {state.step + 1} of {steps.length}
            </div>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.body}</p>
            <div className="tour-actions">
              <button type="button" className="btn btn-ghost btn-small" onClick={pause}>
                Pause
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={skip}>
                Skip
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={back} disabled={state.step === 0}>
                Back
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={next}>
                {state.step === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
