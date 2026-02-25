import { useEffect, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export interface FitLinesData {
    shoulder: { left: { x: number, y: number }, right: { x: number, y: number } }
    chest: { left: { x: number, y: number }, right: { x: number, y: number } }
    waist: { left: { x: number, y: number }, right: { x: number, y: number } }
    width: number
    height: number
}

let poseLandmarkerInstance: PoseLandmarker | null = null
let initializing = false
let initFailed = false

export const useFitLines = (imageUrl: string | null): { data: FitLinesData | null; error: string | null; loading: boolean } => {
    const [data, setData] = useState<FitLinesData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!imageUrl) return

        let active = true
        setLoading(true)
        setError(null)
        setData(null)

        const runDetection = async () => {
            try {
                // Initialize PoseLandmarker if needed
                if (!poseLandmarkerInstance && !initializing && !initFailed) {
                    initializing = true
                    console.log('[FitLines] Initializing PoseLandmarker...')
                    try {
                        const vision = await FilesetResolver.forVisionTasks(
                            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
                        )
                        poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
                            baseOptions: {
                                modelAssetPath: '/pose_landmarker_heavy.task',
                            },
                            runningMode: 'IMAGE',
                            numPoses: 1,
                            minPoseDetectionConfidence: 0.5,
                            minPosePresenceConfidence: 0.5,
                        })
                        console.log('[FitLines] PoseLandmarker initialized successfully')
                    } catch (initErr) {
                        console.error('[FitLines] PoseLandmarker init FAILED:', initErr)
                        initFailed = true
                        if (active) {
                            setError('Pose detection model failed to load')
                            setLoading(false)
                        }
                        return
                    } finally {
                        initializing = false
                    }
                }

                // Wait if another hook instance is initializing
                let waitCount = 0
                while (initializing && active && waitCount < 100) {
                    await new Promise(r => setTimeout(r, 100))
                    waitCount++
                }

                if (!active) return

                if (initFailed || !poseLandmarkerInstance) {
                    if (active) {
                        setError('Pose detection not available')
                        setLoading(false)
                    }
                    return
                }

                // Load the image
                console.log('[FitLines] Loading image:', imageUrl)
                const img = new Image()
                img.crossOrigin = 'anonymous'

                await new Promise<void>((resolve, reject) => {
                    img.onload = () => {
                        console.log('[FitLines] Image loaded successfully:', img.naturalWidth, 'x', img.naturalHeight)
                        resolve()
                    }
                    img.onerror = () => {
                        console.warn('[FitLines] Image failed with crossOrigin, retrying without...')
                        img.removeAttribute('crossOrigin')
                        const retryImg = new Image()
                        retryImg.onload = () => {
                            // Copy dimensions - but we can't use this for MediaPipe without CORS
                            console.warn('[FitLines] Image loaded WITHOUT crossOrigin - canvas will be tainted')
                            resolve()
                        }
                        retryImg.onerror = () => reject(new Error('Image failed to load completely'))
                        retryImg.src = imageUrl
                    }
                    // For local URLs, don't use cache buster
                    if (imageUrl.startsWith('http')) {
                        const cacheBuster = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'cors=' + Date.now()
                        img.src = cacheBuster
                    } else {
                        img.src = imageUrl
                    }
                })

                if (!active) return

                const w = img.naturalWidth
                const h = img.naturalHeight

                if (w === 0 || h === 0) {
                    console.error('[FitLines] Image has zero dimensions')
                    if (active) {
                        setError('Image has invalid dimensions')
                        setLoading(false)
                    }
                    return
                }

                console.log('[FitLines] Running detection for image:', img.src, 'Size:', w, 'x', h)
                const result = poseLandmarkerInstance.detect(img)
                console.log('[FitLines] Pose Landmarker result:', result)

                if (result.landmarks && result.landmarks.length > 0) {
                    const lm = result.landmarks[0]

                    const kp = (idx: number) => ({ x: lm[idx].x * w, y: lm[idx].y * h })

                    const l_sh = kp(11) // left shoulder
                    const r_sh = kp(12) // right shoulder
                    const l_hp = kp(23) // left hip
                    const r_hp = kp(24) // right hip

                    const neck = { x: (l_sh.x + r_sh.x) / 2, y: (l_sh.y + r_sh.y) / 2 }
                    const mid_hip = { x: (l_hp.x + r_hp.x) / 2, y: (l_hp.y + r_hp.y) / 2 }
                    const torso_vec = { x: mid_hip.x - neck.x, y: mid_hip.y - neck.y }

                    const shoulder_width = Math.abs(l_sh.x - r_sh.x)
                    const hip_width = Math.abs(l_hp.x - r_hp.x)

                    const sh_left = l_sh
                    const sh_right = r_sh

                    const chest_center = { x: neck.x + 0.30 * torso_vec.x, y: neck.y + 0.30 * torso_vec.y }
                    const chest_width = shoulder_width * 0.85 + hip_width * 0.15
                    const chest_left = { x: chest_center.x - chest_width / 2, y: chest_center.y }
                    const chest_right = { x: chest_center.x + chest_width / 2, y: chest_center.y }

                    const waist_center = { x: neck.x + 0.68 * torso_vec.x, y: neck.y + 0.68 * torso_vec.y }
                    const waist_width = (shoulder_width * 0.25 + hip_width * 0.75) * 0.88
                    const waist_left = { x: waist_center.x - waist_width / 2, y: waist_center.y }
                    const waist_right = { x: waist_center.x + waist_width / 2, y: waist_center.y }

                    if (active) {
                        setData({
                            shoulder: { left: sh_left, right: sh_right },
                            chest: { left: chest_left, right: chest_right },
                            waist: { left: waist_left, right: waist_right },
                            width: w,
                            height: h
                        })
                        setLoading(false)
                        console.log('[FitLines] ✅ Fit lines data set:', { w, h, l_sh, r_sh, l_hp, r_hp })
                    }
                } else {
                    console.warn('[FitLines] No landmarks detected in image:', imageUrl)
                    if (active) {
                        setError('No pose detected in image')
                        setLoading(false)
                    }
                }
            } catch (err) {
                console.error('[FitLines] Detection error:', err)
                if (active) {
                    setError(err instanceof Error ? err.message : 'Detection failed')
                    setLoading(false)
                }
            }
        }

        runDetection()

        return () => { active = false }
    }, [imageUrl])

    return { data, error, loading }
}
