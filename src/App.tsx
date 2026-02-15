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

  // Global VTON Stream Listener
  useEffect(() => {
    if (!sessionId) return

    const controller = new AbortController()

    const startStream = async () => {
      try {
        await unifiedKioskApi.startVtonStreamWithFetch(
          (result: VtonResultEvent) => {
            console.log('[App] Received VTON result:', result)

            // Logic to handle stitch mode:
            // If the result has a job_id, update all local jobs sharing that job_id.
            // This ensures both garments in a pair get updated even if the event only lists one garment ID.
            const currentJobs = useKioskStore.getState().vtonJobs
            let updatedCount = 0

            if (result.job_id) {
              Object.entries(currentJobs).forEach(([gid, job]) => {
                if (job.jobId === result.job_id) {
                  updateVtonJob(
                    gid, // Update this garment
                    result.status,
                    result.output_image_data || result.output_image_url,
                    result.error || undefined,
                    result.job_id
                  )
                  updatedCount++
                }
              })
            }

            // Fallback: If no jobs matched by ID (or specific single job), update by garment_id from event
            if (updatedCount === 0) {
              updateVtonJob(
                result.garment_id.toString(),
                result.status,
                result.output_image_data || result.output_image_url,
                result.error || undefined,
                result.job_id
              )
            }
          },
          (error: VtonErrorEvent) => {
            console.error('[App] Received VTON error:', error)
            // Similar logic for error
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
          },
          (update) => {
            console.log('[App] Received VTON update:', update)
            // Functionality for updates if needed, e.g. update status to 'PROCESSING'
          },
          controller.signal
        )
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('[App] Stream error:', err)
        // Retry logic could go here
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
  useEffect(() => {
    const currentPath = location.pathname

    // Skip all checks in dev mode to allow editing any page
    if (import.meta.env.DEV) {
      return
    }

    // Pages that don't need a session
    const publicPages = ['/', '/config', '/fit-check', '/products', '/coordinate-finder']
    if (publicPages.includes(currentPath)) {
      return
    }

    // Check for active session
    const session = unifiedKioskApi.getSession()
    if (!session && !sessionId) {
      console.log('[App] No session for protected route, redirecting to home')
      navigate('/', { replace: true })
      return
    }

    // Check if gender is set for flow pages
    const flowPages = ['/capture', '/validate', '/products', '/product', '/tryon', '/tryon-results', '/review', '/purchase']
    if (!userGender && flowPages.some(path => currentPath.startsWith(path))) {
      console.log('[App] No gender set for flow page, redirecting to user-details')
      navigate('/user-details', { replace: true })
    }
  }, [location.pathname, sessionId, userGender, navigate])

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

