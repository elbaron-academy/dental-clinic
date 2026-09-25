import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DependencyList } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => Promise<void>
  setData: (data: T) => void
}

/** Loads data when dependencies change; `reload` re-runs the loader. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const loaderRef = useRef(loader)
  useLayoutEffect(() => {
    loaderRef.current = loader
  })
  const requestId = useRef(0)

  const run = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const result = await loaderRef.current()
      if (id === requestId.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (id === requestId.current) setError(err)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload: run, setData }
}

/** Runs an async action and exposes its pending/error state for buttons and forms. */
export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setPending(true)
    setError(null)
    try {
      return await action()
    } catch (err) {
      setError(err)
      return undefined
    } finally {
      setPending(false)
    }
  }, [])

  return { pending, error, run, setError }
}

/** Polls `callback` every `ms` while the page is visible. */
export function useInterval(callback: () => void, ms: number) {
  const saved = useRef(callback)
  useLayoutEffect(() => {
    saved.current = callback
  })
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') saved.current()
    }, ms)
    return () => window.clearInterval(id)
  }, [ms])
}
