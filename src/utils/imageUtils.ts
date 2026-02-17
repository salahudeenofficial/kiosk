/**
 * Captures a frame, crops to 3:4 aspect ratio (bottom-anchored),
 * resizes to 768x1024, and mirrors horizontally.
 */
export const captureFrameToDataUrl = async (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  track?: MediaStreamTrack | null,
) => {
  // Target dimensions
  // Target dimensions
  const TARGET_ASPECT = 0.75 // 3:4

  // Prefer raw frame from camera track
  const useImageCapture = track && 'ImageCapture' in window
  let sourceWidth = video.videoWidth
  let sourceHeight = video.videoHeight
  let drawable: CanvasImageSource = video

  if (useImageCapture) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Calculate Crop (Source Coordinates)
  let sx, sy, sw, sh
  const sourceAspect = sourceWidth / sourceHeight

  if (sourceAspect > TARGET_ASPECT) {
    // Source is wider than target (Landscape input, Portrait target)
    // Crop center width, keep full height
    sh = sourceHeight
    sw = sourceHeight * TARGET_ASPECT
    sx = (sourceWidth - sw) / 2
    sy = 0
  } else {
    // Source is taller than target (or equal).
    // Crop height (remove top), keep full width
    sw = sourceWidth
    sh = sourceWidth / TARGET_ASPECT
    sx = 0
    // Anchor to Bottom: Start Y is total - crop height
    sy = sourceHeight - sh

    // Safety check if sy < 0 (shouldn't happen if sourceAspect < targetAspect)
    if (sy < 0) sy = 0
  }

  console.log(`[Capture] Cropping: ${sw}x${sh} at (${sx},${sy}) from Source: ${sourceWidth}x${sourceHeight}`)

  // Set canvas to Cropped Dimensions (Full Quality)
  canvas.width = sw
  canvas.height = sh

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Mirror horizontally
  // Context Width is sw
  ctx.setTransform(-1, 0, 0, 1, sw, 0)

  // Draw Cropped Region to Canvas
  try {
    ctx.drawImage(drawable, sx, sy, sw, sh, 0, 0, sw, sh)
  } catch (err) {
    console.error('[Capture] drawImage failed', err)
    return null
  }

  console.log(`[Capture] Final resolution: ${sw}x${sh}`)

  // Return high quality JPEG
  return canvas.toDataURL('image/jpeg', 0.90)
}

