import { useCallback, useState } from 'react'
import { ConfirmDialog, type ConfirmOptions } from '../components/ConfirmDialog'

/**
 * In-app replacement for `window.confirm`:
 * `const { confirm, dialog } = useConfirm()`, render `{dialog}`, then
 * `if (await confirm({ title: '…' })) …`.
 */
export function useConfirm() {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  )

  const dialog = request ? (
    <ConfirmDialog
      {...request}
      onClose={(ok) => {
        request.resolve(ok)
        setRequest(null)
      }}
    />
  ) : null

  return { confirm, dialog }
}
