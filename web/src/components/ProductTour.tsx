import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  page?: string
}

const CARD_GAP = 14
const EDGE = 12
const MOBILE_WIDTH = 640

/** Puts the card just under the highlighted element (or above it when there is no room). */
function placeCard(target: Element, card: HTMLElement): { top: number; left: number } | null {
  if (window.innerWidth <= MOBILE_WIDTH) return null
  const rect = target.getBoundingClientRect()
  const { width, height } = card.getBoundingClientRect()
  const left = Math.min(Math.max(rect.left, EDGE), window.innerWidth - width - EDGE)
  const below = rect.bottom + CARD_GAP
  const above = rect.top - CARD_GAP - height
  let top = below
  if (below + height > window.innerHeight - EDGE) {
    // Not enough room below: go above, or stay in view next to a tall target.
    top = above >= EDGE ? above : Math.max(EDGE, window.innerHeight - height - EDGE)
  }
  return { top, left }
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
  const navigate = useNavigate()
  const [state, setState] = useState<TourState>(() => readTourState())
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null)
  const cardRef = useRef<HTMLElement>(null)

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
      items.splice(3, 0,
        {
          target: '[data-tour="nav-appointments"]',
          title: 'Appointments',
          body: 'Open the appointment schedule to manage booking, check-in, and appointment details.',
          page: '/appointments',
        },
        {
          target: '[data-tour="appointments-content"]',
          title: 'Appointments Page',
          body: 'Here you can view and manage all appointments. Use the calendar or list to check-in patients and update appointment details.',
          page: '/appointments',
        },
      )
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
    if (activeStep.page && location.pathname !== activeStep.page) {
      navigate(activeStep.page)
      return
    }
    const target = document.querySelector(activeStep.target)
    if (target && 'scrollIntoView' in target) {
      target.scrollIntoView({ block: 'center', inline: 'center' })
      target.setAttribute('data-tour-active', 'true')
    }
    return () => {
      document.querySelectorAll('[data-tour-active]').forEach(el => el.removeAttribute('data-tour-active'))
    }
  }, [activeStep, isActive, location.pathname, navigate])

  const reposition = useCallback(() => {
    const target = activeStep ? document.querySelector(activeStep.target) : null
    const card = cardRef.current
    setCardPos(target && card ? placeCard(target, card) : null)
  }, [activeStep])

  useLayoutEffect(() => {
    if (!isActive) return
    reposition()
    const settle = window.setTimeout(reposition, 200) // page change or scroll may still be settling
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.clearTimeout(settle)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [isActive, reposition, location.pathname])

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
          <section
            ref={cardRef}
            className="tour-card"
            aria-live="polite"
            aria-label="Product tour"
            style={cardPos ? { top: cardPos.top, left: cardPos.left, right: 'auto' } : undefined}
          >
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
