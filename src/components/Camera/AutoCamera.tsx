import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKioskStore } from '../../store/kioskStore'
import { captureFrameToDataUrl } from '../../utils/imageUtils'
import { CaptureOverlay } from './CaptureOverlay'
import PoseValidator from './PoseValidator'

// Camera zoom level (1.0 = no zoom, 2.0 = 2x zoom, etc.)
// Adjust this value to control camera zoom
const CAMERA_ZOOM_LEVEL = 1.0

const AutoCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturingRef = useRef(false)
  const [status, setStatus] = useState('Initializing camera…')
  const [progress, setProgress] = useState(0)
  const [hasCaptured, setHasCaptured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [_canStartCapture, setCanStartCapture] = useState(false)
  const [actualResolution, setActualResolution] = useState<string>('')
  const [zoomInfo, setZoomInfo] = useState<string>('')
  const navigate = useNavigate()
  const setUserImage = useKioskStore((state) => state.setUserImage)
  const validatorRef = useRef(new PoseValidator(1500))
  const intervalRef = useRef<number | null>(null)
  const countdownRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        setStatus('Opening camera…')

        // Check if we're in a secure context (HTTPS or localhost)
        // Camera access requires a secure context in modern browsers
        if (!window.isSecureContext) {
          const protocol = window.location.protocol
          const hostname = window.location.hostname
          console.error(`[Camera] Insecure context detected: ${protocol}//${hostname}`)
          setError(`Camera requires HTTPS. Please access this site via HTTPS or localhost.`)
          setStatus('HTTPS Required')
          return
        }

        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('[Camera] mediaDevices API not available')
          setError('Camera API not available. Please use a modern browser with HTTPS.')
          setStatus('Camera unavailable')
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
        } catch (playErr: any) {
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
            const capabilities = track.getCapabilities() as any
            console.log('[Camera] Full capabilities:', JSON.stringify(capabilities, null, 2))

            if (capabilities?.zoom) {
              const { min, max, step } = capabilities.zoom
              console.log(`[Camera] Zoom range: min=${min}, max=${max}, step=${step}`)

              // When CAMERA_ZOOM_LEVEL is 1.0, use minimum zoom for WIDEST possible angle
              // Higher values zoom IN (closer)
              const targetZoom = CAMERA_ZOOM_LEVEL <= 1.0 ? min : Math.max(min, Math.min(max, CAMERA_ZOOM_LEVEL))

              try {
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
      } catch (err: any) {
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
        setStatus('Camera blocked')
      }
    }

    const startCountdown = () => {
      setStatus('Get ready...')
      setCountdown(5)

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
          setStatus('Center yourself and hold still')
          beginStabilityCheck()
        }
      }, 1000)
    }

    const beginStabilityCheck = () => {
      intervalRef.current = window.setInterval(() => {
        const { stable, progress: poseProgress } =
          validatorRef.current.updatePose(true)
        setProgress(poseProgress)

        if (stable && !hasCaptured) {
          handleCapture()
        }
      }, 350)
    }

    startCamera()

    return () => {
      isMounted = false
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (countdownRef.current) window.clearInterval(countdownRef.current)
      validatorRef.current.reset()
      const currentStream = streamRef.current || stream
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCapture = async () => {
    if (capturingRef.current) return
    if (!videoRef.current || !canvasRef.current) return

    capturingRef.current = true
    try {
      // Capture raw frame without any cropping/preprocessing
      const dataUrl = await captureFrameToDataUrl(
        videoRef.current,
        canvasRef.current,
        trackRef.current,
      )
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
      setStatus('Capturing frame…')
      setUserImage(dataUrl)
      setTimeout(() => navigate('/validate'), 350)
    } catch (err) {
      console.error('Capture failed', err)
      capturingRef.current = false
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full h-full max-w-[90vw] max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain rounded-2xl"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        <CaptureOverlay
          status={countdown !== null ? `${countdown}` : status}
          progress={countdown !== null ? (5 - (countdown || 0)) / 5 : progress}
          hint={
            error
              ? error
              : countdown !== null
                ? 'Get ready...'
                : `Keep shoulders visible. Auto-capture starts after 1.5s.${actualResolution ? ` (${actualResolution})` : ''}${zoomInfo ? ` | ${zoomInfo}` : ''}`
          }
        />
      </div>
    </div>
  )
}

export default AutoCamera
