import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  /** Label of the confirming button; keep it distinct from the button that opened the dialog. */
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` for destructive actions such as cancelling an appointment. */
  tone?: 'primary' | 'danger'
}

/** In-app replacement for `window.confirm`; use it through `useConfirm` (lib/useConfirm.tsx). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const id = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current(false)
      } else if (event.key === 'Tab') {
        // Keep focus on the two buttons while the dialog is open.
        event.preventDefault()
        const next = document.activeElement === confirmRef.current ? cancelRef.current : confirmRef.current
        next?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false)
      }}
    >
      <div
        className={`modal modal-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={message ? `${id}-message` : undefined}
      >
        <div className="modal-icon" aria-hidden="true">
          {tone === 'danger' ? '!' : '?'}
        </div>
        <div className="modal-body">
          <h2 id={`${id}-title`}>{title}</h2>
          {message && (
            <div id={`${id}-message`} className="modal-message">
              {message}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={() => onClose(false)}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
