import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import MotionFade from '../components/UI/MotionFade'
import LoadingPulse from '../components/UI/LoadingPulse'
import { useKioskStore } from '../store/kioskStore'
import { api } from '../utils/api'
import useAutoNavigate from '../hooks/useAutoNavigate'

type VtonJob = {
  garment_id: string
  productName: string
  imageUrl: string | null
}

const POLL_INTERVAL_MS = 1000

const TryOnResultsScreen = () => {
  useAutoNavigate()
  const navigate = useNavigate()
  const selectedProducts = useKioskStore((state) => state.selectedProducts)
  const userToken = useKioskStore((state) => state.userToken)
  const userId = useKioskStore((state) => state.userId)
  const setVtonResults = useKioskStore((state) => state.setVtonResults)
  const resetAll = useKioskStore((state) => state.resetAll)

  const [jobs, setJobs] = useState<VtonJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isCreatingJobs, setIsCreatingJobs] = useState(true)

  // Use a session ID to track the current polling session
  // When cleanup happens, we increment the session ID so old polls stop
  const sessionIdRef = useRef(0)
  const pollTimeoutRef = useRef<number | null>(null)
  const hasInitiatedRef = useRef(false) // Prevent StrictMode double-mount

  // Main effect
  useEffect(() => {
    // Prevent StrictMode double-mount from creating duplicate jobs
    if (hasInitiatedRef.current) {
      console.log('[INIT] Already initiated, skipping duplicate mount')
      return
    }
    hasInitiatedRef.current = true

    // Increment session ID to invalidate any previous polling sessions
    const currentSessionId = ++sessionIdRef.current
    console.log(`[Session ${currentSessionId}] Starting new session`)

    // Clear any pending timeouts from previous session
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }

    // Reset state
    setJobs([])
    setError(null)
    setIsCreatingJobs(true)
    setVtonResults([]) // Clear old results from store

    if (!userToken || !userId || selectedProducts.length === 0) {
      console.log(`[Session ${currentSessionId}] Missing data, redirecting`)
      navigate('/products')
      return
    }

    // Track completed jobs for this session
    const completedJobIds = new Set<string>()
    let totalJobsCreated = 0

    // Polling function
    const pollOnce = async (jobsList: VtonJob[], pollIndex: number) => {
      // Check if this polling session is still valid
      if (sessionIdRef.current !== currentSessionId) {
        console.log(`[Session ${currentSessionId}] Session invalidated, stopping poll`)
        return
      }

      // Check if still on the results page
      if (window.location.pathname !== '/tryon-results') {
        console.log(`[Session ${currentSessionId}] User left page, stopping poll`)
        return
      }

      const pendingJobs = jobsList.filter(j => j.imageUrl === null)
      const pendingIds = pendingJobs.map(j => j.garment_id).join(', ')
      const completedIds = Array.from(completedJobIds).join(', ')
      console.log(`[POLL] Session ${currentSessionId} | Pending garments: [${pendingIds}] | Completed: [${completedIds}] (${completedJobIds.size}/${totalJobsCreated})`)

      // Check if all jobs are done
      if (completedJobIds.size >= totalJobsCreated && totalJobsCreated > 0) {
        console.log(`[Session ${currentSessionId}] 🎉 All ${totalJobsCreated} jobs complete!`)
        return
      }

      if (pendingJobs.length === 0) {
        // All jobs in list have images but completedJobIds count doesn't match
        // This shouldn't happen, but poll again just in case
        console.log(`[Session ${currentSessionId}] No pending jobs but count mismatch, polling again...`)
        pollTimeoutRef.current = window.setTimeout(() => pollOnce(jobsList, pollIndex), POLL_INTERVAL_MS)
        return
      }

      // Round-robin through pending jobs
      const jobToPoll = pendingJobs[pollIndex % pendingJobs.length]
      const nextPollIndex = pollIndex + 1

      console.log(`[POLL] Session ${currentSessionId} | >>> Fetching result for GARMENT ID: ${jobToPoll.garment_id} <<<`)

      try {
        const imageUrl = await api.getVtonResultImage(userToken, userId, jobToPoll.garment_id)

        // Re-check if session is still valid after async call
        if (sessionIdRef.current !== currentSessionId) {
          console.log(`[Session ${currentSessionId}] Session invalidated after API call`)
          return
        }

        if (imageUrl) {
          console.log(`[POLL] Session ${currentSessionId} | ✓ GOT IMAGE for GARMENT ID: ${jobToPoll.garment_id}`)
          completedJobIds.add(jobToPoll.garment_id)

          // Update jobs list
          const updatedJobs = jobsList.map(j =>
            j.garment_id === jobToPoll.garment_id ? { ...j, imageUrl } : j
          )
          setJobs(updatedJobs)
          setVtonResults(updatedJobs.filter(j => j.imageUrl).map(j => j.imageUrl!))

          // Check if all done now
          if (completedJobIds.size >= totalJobsCreated) {
            console.log(`[Session ${currentSessionId}] 🎉 All ${totalJobsCreated} jobs complete!`)
            return
          }

          // Continue polling with updated list
          console.log(`[Session ${currentSessionId}] ${totalJobsCreated - completedJobIds.size} jobs remaining, next poll in ${POLL_INTERVAL_MS}ms`)
          pollTimeoutRef.current = window.setTimeout(() => pollOnce(updatedJobs, nextPollIndex), POLL_INTERVAL_MS)
        } else {
          // Not ready yet, poll again
          console.log(`[POLL] Session ${currentSessionId} | ⏳ Still processing GARMENT ID: ${jobToPoll.garment_id}, retrying in ${POLL_INTERVAL_MS}ms`)
          pollTimeoutRef.current = window.setTimeout(() => pollOnce(jobsList, nextPollIndex), POLL_INTERVAL_MS)
        }
      } catch (err) {
        console.error(`[Session ${currentSessionId}] Poll error for ${jobToPoll.garment_id}:`, err)

        // Re-check session validity
        if (sessionIdRef.current !== currentSessionId) {
          return
        }

        // Continue polling despite error
        pollTimeoutRef.current = window.setTimeout(() => pollOnce(jobsList, nextPollIndex), POLL_INTERVAL_MS)
      }
    }

    // Create jobs and start polling
    const createAndPoll = async () => {
      const productsToProcess = selectedProducts.slice(0, 3)
      console.log(`[Session ${currentSessionId}] Creating ${productsToProcess.length} VTON jobs...`)

      const jobPromises = productsToProcess.map(async (product) => {
        try {
          console.log(`[TRYON] Session ${currentSessionId} | Creating job for GARMENT ID: ${product.id}`)
          await api.createVtonJob(userToken, userId, product.id)
          return {
            garment_id: String(product.id),
            productName: product.title || 'Product',
            imageUrl: null as string | null,
          }
        } catch (err) {
          console.error(`[Session ${currentSessionId}] Error creating job for ${product.id}:`, err)
          return null
        }
      })

      const results = await Promise.all(jobPromises)

      // Check session is still valid after async work
      if (sessionIdRef.current !== currentSessionId) {
        console.log(`[Session ${currentSessionId}] Session invalidated during job creation`)
        return
      }

      const createdJobs = results.filter((j): j is VtonJob => j !== null)

      if (createdJobs.length === 0) {
        setError('Failed to create try-on jobs. Please try again.')
        setIsCreatingJobs(false)
        return
      }

      const allGarmentIds = createdJobs.map(j => j.garment_id).join(', ')
      console.log(`[TRYON] Session ${currentSessionId} | ✓ JOBS CREATED | Total: ${createdJobs.length} | GARMENT IDs: [${allGarmentIds}]`)

      totalJobsCreated = createdJobs.length
      setJobs(createdJobs)
      setIsCreatingJobs(false)

      // Start polling after a short delay
      console.log(`[Session ${currentSessionId}] Starting polling in 500ms...`)
      pollTimeoutRef.current = window.setTimeout(() => {
        console.log(`[Session ${currentSessionId}] First poll starting now`)
        pollOnce(createdJobs, 0)
      }, 500)
    }

    createAndPoll()

    // Cleanup function - the session ID increment at the start of the next effect
    // will automatically stop any ongoing polling
    return () => {
      console.log(`[Session ${currentSessionId}] Cleanup called`)
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
        pollTimeoutRef.current = null
      }
      // Reset for next real navigation (not StrictMode re-mount)
      // Use setTimeout to allow StrictMode's immediate re-mount to see the flag as true
      setTimeout(() => {
        hasInitiatedRef.current = false
      }, 100)
    }
  }, [userId, userToken, selectedProducts, navigate, setVtonResults])

  const handleDone = () => {
    // Increment session to stop any ongoing polling
    sessionIdRef.current++
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    // Reset all kiosk state for new user
    resetAll()
    navigate('/')
  }

  const allLoaded = jobs.length > 0 && jobs.every(j => j.imageUrl !== null)

  if (isCreatingJobs) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full flex flex-col items-center justify-center">
        <LoadingPulse className="text-white max-w-[200px]" />
        <p className="text-xl text-white/70 text-center mt-6">Starting your try-on...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full flex flex-col items-center justify-center p-8">
        <p className="text-xl text-red-400 mb-6">{error}</p>
        <button onClick={handleDone} className="px-8 py-3 bg-white text-black rounded-xl font-bold">
          Return Home
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden z-50 min-h-screen w-full">
      <MotionFade className="flex flex-col h-full w-full">
        <div className="px-[4%] pt-[12%] pb-0 flex items-center justify-center">
          <h2 className="text-clamp-title font-bold text-white text-center">Your Try-On Results</h2>
        </div>

        <div className="flex-1 flex items-start justify-center px-[4%] pb-[4%] pt-4">
          {jobs.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={20}
              slidesPerView={1}
              centeredSlides
              pagination={{
                clickable: true,
                bulletClass: 'swiper-pagination-bullet !bg-white/30 !w-3 !h-3',
                bulletActiveClass: '!bg-white !scale-125',
              }}
              className="w-full h-full"
            >
              {jobs.map((job) => (
                <SwiperSlide key={job.garment_id} className="flex items-center justify-center">
                  <div className="w-full max-w-md aspect-[3/4] bg-slate-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                    {job.imageUrl ? (
                      <img src={job.imageUrl} alt={job.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-6">
                        <LoadingPulse className="text-white" />
                        <p className="text-sm text-white/60 text-center">Generating {job.productName}...</p>
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="text-white/60">No results available</p>
          )}
        </div>

        <div className="px-[4%] pb-[6%] flex gap-4">
          <button
            onClick={handleDone}
            disabled={!allLoaded}
            className={`w-full py-4 rounded-xl font-bold ${allLoaded ? 'bg-white text-black' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}
          >
            Done
          </button>
        </div>
      </MotionFade>
    </div>
  )
}

export default TryOnResultsScreen
