/**
 * Captures a raw frame from a video element without any cropping or preprocessing.
 * Only mirrors horizontally to match the preview.
 */
export const captureFrameToDataUrl = async (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  track?: MediaStreamTrack | null,
) => {
  // Prefer raw frame from camera track (full resolution), fallback to video element
  const useImageCapture = track && 'ImageCapture' in window
  let sourceWidth = video.videoWidth
  let sourceHeight = video.videoHeight
  let drawable: CanvasImageSource = video

  if (useImageCapture) {
    try {
      // Grab full-res frame directly from camera
      const imageCapture = new (window as any).ImageCapture(track!)
      const bitmap: ImageBitmap = await imageCapture.grabFrame()
      sourceWidth = bitmap.width
      sourceHeight = bitmap.height
      drawable = bitmap
      console.log(`[Capture] Using ImageCapture: ${sourceWidth}x${sourceHeight}`)
    } catch (err) {
      console.warn('[Capture] ImageCapture failed, falling back to video element', err)
    }
  }

  if (!sourceWidth || !sourceHeight) {
    console.error('[Capture] Source dimensions are zero')
    return null
  }

  // Set canvas to full source dimensions - no cropping
  canvas.width = sourceWidth
  canvas.height = sourceHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Mirror horizontally to match the preview
  ctx.setTransform(-1, 0, 0, 1, sourceWidth, 0)

  // Draw the full frame without cropping
  ctx.drawImage(drawable, 0, 0, sourceWidth, sourceHeight)

  console.log(`[Capture] Raw capture: ${sourceWidth}x${sourceHeight}`)

  return canvas.toDataURL('image/jpeg', 0.50) // 50% quality JPEG
}

