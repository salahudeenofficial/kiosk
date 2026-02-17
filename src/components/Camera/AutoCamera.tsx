import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKioskStore } from '../../store/kioskStore'
import { captureFrameToDataUrl } from '../../utils/imageUtils'
import { CaptureOverlay } from './CaptureOverlay'
import { PoseDetector } from './PoseDetector'
import PoseValidator from './PoseValidator'
import { SilhouetteOverlay } from './SilhouetteOverlay'

// Camera zoom level (1.0 = no zoom, 2.0 = 2x zoom, etc.)
// Adjust this value to control camera zoom
const CAMERA_ZOOM_LEVEL = 1.0

const AutoCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturingRef = useRef(false)
  const [status, setStatus] = useState('MAKE SURE FULL BODY IS IN FRAME')
  const [progress, setProgress] = useState(0)
  const [hasCaptured, setHasCaptured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [, setCanStartCapture] = useState(false)
  const [, setActualResolution] = useState<string>('')
  const [isPoseValid, setIsPoseValid] = useState<boolean>(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [, setZoomInfo] = useState<string>('')
  const navigate = useNavigate()
  const setUserImage = useKioskStore((state) => state.setUserImage)
  const validatorRef = useRef(new PoseValidator(800))
  const poseDetectorRef = useRef<PoseDetector | null>(null)
  const intervalRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)
  const tentativeFrameRef = useRef<string | null>(null)
  /* New state for switching misalignment text using Ref to avoid stale closure in interval */
  const misalignmentTextRef = useRef('POSE MISALIGNMENT')

  useEffect(() => {
    const interval = setInterval(() => {
      misalignmentTextRef.current = misalignmentTextRef.current === 'POSE MISALIGNMENT' ? '\u00A0' : 'POSE MISALIGNMENT'
    }, 600)
    return () => clearInterval(interval)
  }, [])

  /* Remove unused state if I replaced it with ref, or keep valid state for render but use ref for callback? 
     Functionally, `setStatus(misalignmentTextRef.current)` works inside interval.
     So I don't need `useState` for `misalignmentText` unless I render it directly in JSX (I don't, I render `status`).
     So Ref is sufficient.
  */

  const isCapturingTentativeRef = useRef(false)

  useEffect(() => {
    let isMounted = true
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        setStatus('STARTING...')

        // Check if we're in a secure context (HTTPS or localhost)
        // Camera access requires a secure context in modern browsers
        if (!window.isSecureContext) {
          const protocol = window.location.protocol
          const hostname = window.location.hostname
          console.error(`[Camera] Insecure context detected: ${protocol}//${hostname}`)
          setError('HTTPS REQUIRED')
          setStatus('HTTPS NEEDED')
          return
        }

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('[Camera] mediaDevices API not available')
          setError('NO CAMERA API')
          setStatus('NO CAMERA')
          return
        }

        // Request raw 4K resolution directly - no fallbacks, no aspect ratio constraints
        console.log('[Camera] Requesting raw 4K resolution...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 3840 },   // 4K width
            height: { ideal: 2160 },  // 4K height
            // No aspect ratio constraint - use camera's native ratio
          },
          audio: false,
        })
        streamRef.current = stream

        if (!isMounted || !videoRef.current) return

        videoRef.current.srcObject = stream

        try {
          await videoRef.current.play()
        } catch (playErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.log('Video play interrupted:', playErr)
          if (playErr.name !== 'AbortError') {
            return
          }
        }

        // Log actual resolution obtained and apply zoom
        const track = stream.getVideoTracks()[0]
        trackRef.current = track || null
        if (track) {
          const settings = track.getSettings()
          const resInfo = `${settings.width}x${settings.height}`
          setActualResolution(resInfo)
          console.log(`[Camera] Actual resolution: ${resInfo}`)

          // Apply zoom level if camera supports it - log all capabilities for debugging
          if ('getCapabilities' in track) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const capabilities = track.getCapabilities() as any
            console.log('[Camera] Full capabilities:', JSON.stringify(capabilities, null, 2))

            if (capabilities?.zoom) {
              const { min, max, step } = capabilities.zoom
              console.log(`[Camera] Zoom range: min=${min}, max=${max}, step=${step}`)

              // When CAMERA_ZOOM_LEVEL is 1.0, use minimum zoom for WIDEST possible angle
              // Higher values zoom IN (closer)
              const targetZoom = CAMERA_ZOOM_LEVEL <= 1.0 ? min : Math.max(min, Math.min(max, CAMERA_ZOOM_LEVEL))

              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await track.applyConstraints({ advanced: [{ zoom: targetZoom } as any] })
                setZoomInfo(`${targetZoom.toFixed(1)}x (range: ${min}-${max})`)
                console.log(`[Camera] ✓ Applied zoom: ${targetZoom}x (widest possible = ${min})`)
              } catch (zoomErr) {
                console.warn('[Camera] Failed to apply zoom:', zoomErr)
                setZoomInfo('zoom failed')
              }
            } else {
              console.log('[Camera] Zoom NOT supported by this camera')
              setZoomInfo('no zoom')
            }
          }
        }

        startCountdown()
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('Camera error:', err)
        let errorMessage = 'Camera permission is required to continue.'

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and refresh.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found. Please connect a camera device.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is already in use by another application.'
        } else {
          errorMessage = `Camera error: ${err.message || err.name || 'Unknown error'}`
        }

        setError(errorMessage)
        setStatus('CAMERA BLOCKED')
      }
    }

    const startCountdown = () => {
      setStatus('MAKE SURE FULL BODY IS IN-FRAME')
      setCountdown(5)

      // Init pose detector in parallel with countdown
      const detector = new PoseDetector()
      poseDetectorRef.current = detector
      detector.init().catch((err) => {
        console.error('[PoseDetector] Init failed:', err)
      })

      let remaining = 5
      countdownRef.current = window.setInterval(() => {
        remaining--
        setCountdown(remaining)

        if (remaining <= 0) {
          if (countdownRef.current) {
            window.clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          setCountdown(null)
          setCanStartCapture(true)
          setStatus('MAKE SURE FULL BODY IS IN-FRAME')
          beginStabilityCheck()
        }
      }, 1000)
    }

    /* Initial Status Update */
    /* Remove old state init if needed, or rely on useEffect/logic. Wait, I see initial state: const [status, setStatus] = useState('MAKE SURE FULL BODY IS IN-FRAME') above. I need to update that line basically or overwrite it. Since I can't edit that far up easily without context loss, I'll rely on effect to overwrite quickly or just ensure logic sets it. 
       Actually, let's just make sure the logic handles "No Person" or "Out of Frame" correctly from the start.
    */

    const beginStabilityCheck = () => {
      intervalRef.current = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current || !poseDetectorRef.current) return
        // Stop checking if we are already capturing
        if (capturingRef.current) return

        const { isAPose, feedback } = poseDetectorRef.current.detect(
          videoRef.current,
          performance.now(),
        )

        // Capture first valid frame logic
        if (isAPose) {
          if (!tentativeFrameRef.current && !isCapturingTentativeRef.current) {
            isCapturingTentativeRef.current = true
            captureFrameToDataUrl(
              videoRef.current,
              canvasRef.current,
              trackRef.current,
            )
              .then((url) => {
                if (isMounted) tentativeFrameRef.current = url
                isCapturingTentativeRef.current = false
              })
              .catch(() => {
                isCapturingTentativeRef.current = false
              })
          }
        } else {
          // Clear tentative frame if pose is lost, restart sequence
          tentativeFrameRef.current = null
        }

        // Update pose validity state for silhouette color
        setIsPoseValid(isAPose)

        const { stable, progress: poseProgress } =
          validatorRef.current.updatePose(isAPose)
        setProgress(poseProgress)

        // Update status with new logic
        if (!stable && !hasCaptured) {
          if (feedback.includes('OUT OF FRAME') || feedback.includes('NO PERSON')) {
            setStatus('FULL-BODY NOT IN-FRAME')
          } else if (feedback.includes('MISALIGNED') || !isAPose) {
            // If not out of frame but still not a valid pose (e.g. misalignment)
            setStatus(misalignmentTextRef.current)
          } else {
            // Should only be HOLD STILL if isAPose is true
            setStatus(feedback || 'MAKE SURE FULL BODY IS IN FRAME')
          }
        }

        if (stable && !hasCaptured) {
          handleCapture(tentativeFrameRef.current)
        }
      }, 150)
    }

    startCamera()

    const validator = validatorRef.current
    return () => {
      isMounted = false
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (countdownRef.current) window.clearInterval(countdownRef.current)
      validator.reset()
      poseDetectorRef.current?.close()
      poseDetectorRef.current = null
      const currentStream = streamRef.current || stream
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCapture = async (preCapturedFrame?: string | null) => {
    if (capturingRef.current) return
    if (!videoRef.current || !canvasRef.current) return

    capturingRef.current = true
    try {
      // Use pre-captured frame if available to get the first valid frame
      let dataUrl = preCapturedFrame

      if (!dataUrl) {
        // Fallback: Capture raw frame without any cropping/preprocessing
        dataUrl = await captureFrameToDataUrl(
          videoRef.current,
          canvasRef.current,
          trackRef.current,
        )
      }
      if (!dataUrl) {
        capturingRef.current = false
        return
      }

      // Stop the camera stream immediately after capture to guarantee we only show the frozen capture
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      setHasCaptured(true)
      setStatus('CAPTURING...')

      setUserImage(dataUrl)
      setCapturedImage(dataUrl)
      setTimeout(() => navigate('/validate'), 350)
    } catch (err) {
      console.error('Capture failed', err)
      capturingRef.current = false
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-slate-900">

      {/* Container forced to 3:4 aspect ratio */}
      <div className="relative h-[65vh] w-auto aspect-[3/4] max-w-full rounded-3xl overflow-hidden border-gray-200 shadow-2xl bg-gray-100">
        {capturedImage ? (
          <img
            src={capturedImage}
            className="w-full h-full object-cover"
            alt="Captured"
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)', objectPosition: 'bottom center' }}
            playsInline
            muted
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        <SilhouetteOverlay isValid={isPoseValid} />
      </div>

      <CaptureOverlay
        status={countdown !== null ? `${countdown}` : status}
        progress={countdown !== null ? (5 - (countdown || 0)) / 5 : progress}
        hint={
          error
            ? error
            : countdown !== null || status === 'CAPTURING...'
              ? 'MAKE SURE FULL BODY IS IN-FRAME'
              : undefined
        }
      />
    </div>
  )
}

export default AutoCamera
