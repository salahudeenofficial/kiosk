import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import MotionFade from './components/UI/MotionFade'
import { useKioskStore } from './store/kioskStore'
// import useSessionTimeout from './hooks/useSessionTimeout'
import SessionTimeoutBar from './components/UI/SessionTimeoutBar'
import DebugPanel from './components/Debug/DebugPanel'
import { unifiedKioskApi } from './utils/unifiedKioskApi'
import type { VtonResultEvent, VtonErrorEvent } from './utils/kioskApi'

const AppLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const userGender = useKioskStore((state) => state.userGender)
  const sessionId = useKioskStore((state) => state.sessionId)
  const setIsConfigured = useKioskStore((state) => state.setIsConfigured)
  const updateVtonJob = useKioskStore((state) => state.updateVtonJob)

  // Global VTON Stream Listener with auto-reconnect
  useEffect(() => {
    if (!sessionId) return

    const controller = new AbortController()
    let retryCount = 0
    const MAX_RETRIES = 10
    const BASE_DELAY_MS = 1000
    const MAX_DELAY_MS = 30000

    const handleResult = (result: VtonResultEvent) => {
      console.log('[App] Received VTON result:', result)
      retryCount = 0 // Reset backoff on successful data

      const currentJobs = useKioskStore.getState().vtonJobs
      let updatedCount = 0

      if (result.job_id) {
        Object.entries(currentJobs).forEach(([gid, job]) => {
          if (job.jobId === result.job_id) {
            updateVtonJob(
              gid,
              result.status,
              result.output_image_data || result.output_image_url,
              result.error || undefined,
              result.job_id
            )
            updatedCount++
          }
        })
      }

      if (updatedCount === 0) {
        updateVtonJob(
          result.garment_id.toString(),
          result.status,
          result.output_image_data || result.output_image_url,
          result.error || undefined,
          result.job_id
        )
      }
    }

    const handleError = (error: VtonErrorEvent) => {
      console.error('[App] Received VTON error:', error)

      const currentJobs = useKioskStore.getState().vtonJobs
      let updatedCount = 0

      if (error.job_id) {
        Object.entries(currentJobs).forEach(([gid, job]) => {
          if (job.jobId === error.job_id) {
            updateVtonJob(
              gid,
              error.status,
              null,
              error.error,
              error.job_id
            )
            updatedCount++
          }
        })
      }

      if (updatedCount === 0) {
        updateVtonJob(
          error.garment_id.toString(),
          error.status,
          null,
          error.error,
          error.job_id
        )
      }
    }

    const handleUpdate = (update: unknown) => {
      console.log('[App] Received VTON update:', update)
      retryCount = 0
    }

    const startStream = async () => {
      while (!controller.signal.aborted && retryCount < MAX_RETRIES) {
        try {
          console.log(`[App] Starting SSE stream (attempt ${retryCount + 1})`)
          await unifiedKioskApi.startVtonStreamWithFetch(
            handleResult,
            handleError,
            handleUpdate,
            controller.signal
          )
          // Stream ended normally (server closed) — reconnect
          if (controller.signal.aborted) return
          console.log('[App] Stream ended, reconnecting...')
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          console.error('[App] Stream error:', err)
        }

        // Exponential backoff with jitter
        retryCount++
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount - 1), MAX_DELAY_MS)
        const jitter = delay * 0.3 * Math.random()
        console.log(`[App] Reconnecting in ${Math.round(delay + jitter)}ms (retry ${retryCount}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay + jitter))
      }

      if (retryCount >= MAX_RETRIES) {
        console.error('[App] SSE stream max retries reached, giving up')
      }
    }

    startStream()

    return () => {
      controller.abort()
    }
  }, [sessionId, updateVtonJob])

  // Initialize session timeout logic
  // const { remaining, resetTimer, isWarning } = useSessionTimeout() moved to component

  // Check if kiosk is configured on mount
  useEffect(() => {
    // Check for reset param
    const params = new URLSearchParams(location.search)
    if (params.get('reset') === 'true') {
      console.log('Resetting kiosk configuration...')
      localStorage.clear()
      sessionStorage.clear()
      // Use window.location to force full reload and clear memory state
      window.location.replace('/')
      return
    }

    const config = unifiedKioskApi.getConfig()
    if (config) {
      setIsConfigured(true)
    }
  }, [setIsConfigured, location.search])

  // Route protection: redirect to appropriate pages based on session state
  // On reload, in-memory session is lost — terminate and go back to idle
  const resetSession = useKioskStore((state) => state.resetSession)

  useEffect(() => {
    const currentPath = location.pathname

    // Skip all checks in dev mode to allow editing any page
    if (import.meta.env.DEV) {
      return
    }

    // Pages that never need a session
    const publicPages = ['/', '/config', '/coordinate-finder']
    if (publicPages.includes(currentPath)) {
      return
    }

    // Check for active session (in-memory — cleared on reload)
    const session = unifiedKioskApi.getSession()
    if (!session && !sessionId) {
      console.log('[App] No session (likely page reload), resetting and redirecting to idle')
      resetSession()
      navigate('/', { replace: true })
      return
    }

    // Check if gender is set for flow pages
    const flowPages = ['/capture', '/validate', '/products', '/product', '/tryon', '/tryon-results', '/review', '/purchase']
    if (!userGender && flowPages.some(path => currentPath.startsWith(path))) {
      console.log('[App] No gender set for flow page, redirecting to user-details')
      navigate('/user-details', { replace: true })
    }
  }, [location.pathname, sessionId, userGender, navigate, resetSession])

  // Check for pages that handle their own layout (full screen, white theme)
  const isFullScreenPage =
    location.pathname === '/capture' ||
    location.pathname === '/products' ||
    location.pathname === '/tryon-results' ||
    location.pathname === '/fit-check' ||
    location.pathname.startsWith('/product/')

  if (isFullScreenPage) {
    return (
      <div className="relative min-h-screen w-full">
        <Outlet />

        <SessionTimeoutBar />

        {/* Debug Panel - only visible in development */}
        <DebugPanel />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-kiosk-gradient text-slate-50 relative">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-[4%]">
        <MotionFade className="flex-1 flex flex-col">
          <Outlet />
        </MotionFade>

        <SessionTimeoutBar />
      </div>

      {/* Debug Panel - only visible in development */}
      <DebugPanel />
    </div>
  )
}

export default AppLayout

