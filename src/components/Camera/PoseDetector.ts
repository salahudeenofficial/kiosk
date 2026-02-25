import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'

export interface PoseResult {
  isAPose: boolean
  confidence: number
  feedback: string
}

const NOSE = 0
const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_ELBOW = 13
const RIGHT_ELBOW = 14
const LEFT_WRIST = 15
const RIGHT_WRIST = 16
const LEFT_HIP = 23
const RIGHT_HIP = 24
const LEFT_ANKLE = 27
const RIGHT_ANKLE = 28

const FRAMING_LANDMARKS = [NOSE, LEFT_ANKLE, RIGHT_ANKLE]

const ARM_LANDMARKS = [
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_ELBOW,
  RIGHT_ELBOW,
  LEFT_WRIST,
  RIGHT_WRIST,
  LEFT_HIP,
  RIGHT_HIP,
]

const ARM_ANGLE_MIN = 20
const ARM_ANGLE_MAX = 90
const ELBOW_STRAIGHTNESS_MIN = 110
const VISIBILITY_THRESHOLD = 0.45
const FRAME_MARGIN = 0.10
const FRAME_MIN = FRAME_MARGIN
const FRAME_MAX = 1 - FRAME_MARGIN

type Vec3 = { x: number; y: number; z: number }

function angleBetweenVectors(a: Vec3, b: Vec3): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z
  const magA = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2)
  const magB = Math.sqrt(b.x ** 2 + b.y ** 2 + b.z ** 2)
  if (magA === 0 || magB === 0) return 0
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)))
  return (Math.acos(cosAngle) * 180) / Math.PI
}

function vec(from: Vec3, to: Vec3): Vec3 {
  return { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }
}

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null
  private ready = false

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    )
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
    })
    this.ready = true
  }

  detect(video: HTMLVideoElement, timestamp: number): PoseResult {
    if (!this.landmarker || !this.ready) {
      return { isAPose: false, confidence: 0, feedback: 'LOADING...' }
    }

    let result: PoseLandmarkerResult
    try {
      result = this.landmarker.detectForVideo(video, timestamp)
    } catch {
      return { isAPose: false, confidence: 0, feedback: 'ERROR' }
    }

    if (
      !result.worldLandmarks ||
      result.worldLandmarks.length === 0 ||
      !result.landmarks ||
      result.landmarks.length === 0
    ) {
      return { isAPose: false, confidence: 0, feedback: 'NO PERSON DETECTED' }
    }

    const world = result.worldLandmarks[0]
    const normalized = result.landmarks[0]
    const issues: Set<string> = new Set()

    // 1. Framing Check (Head and Feet in bounds)
    for (const idx of FRAMING_LANDMARKS) {
      const lm = normalized[idx]
      const outOfFrame =
        !lm ||
        (lm.visibility ?? 0) < VISIBILITY_THRESHOLD ||
        lm.x < FRAME_MIN ||
        lm.x > FRAME_MAX ||
        lm.y < FRAME_MIN ||
        lm.y > FRAME_MAX

      if (outOfFrame) {
        issues.add('OUT OF FRAME')
        break // One is enough to flag
      }
    }

    // 2. Arms Visibility Check
    let armsVisible = true
    for (const idx of ARM_LANDMARKS) {
      const lm = normalized[idx]
      if (
        !lm ||
        (lm.visibility ?? 0) < VISIBILITY_THRESHOLD ||
        lm.x < FRAME_MIN ||
        lm.x > FRAME_MAX ||
        lm.y < FRAME_MIN ||
        lm.y > FRAME_MAX
      ) {
        issues.add('OUT OF FRAME')
        armsVisible = false
        break
      }
    }

    // 3. Pose/Alignment Check
    if (armsVisible) {
      const lShoulder = world[LEFT_SHOULDER]
      const rShoulder = world[RIGHT_SHOULDER]
      const lElbow = world[LEFT_ELBOW]
      const rElbow = world[RIGHT_ELBOW]
      const lWrist = world[LEFT_WRIST]
      const rWrist = world[RIGHT_WRIST]
      const lHip = world[LEFT_HIP]
      const rHip = world[RIGHT_HIP]

      // Helper to project vectors to 2D (ignore Z-depth)
      // This prevents "arms forward" (which looks like A-pose in 3D angle) from passing as A-pose.
      // We want strictly "arms to the side".
      const to2D = (v: Vec3) => ({ x: v.x, y: v.y, z: 0 })

      // Arm angle: angle between shoulder→hip and shoulder→elbow (Calculated in 2D)
      const leftArmAngle = angleBetweenVectors(
        to2D(vec(lShoulder, lHip)),
        to2D(vec(lShoulder, lElbow)),
      )
      const rightArmAngle = angleBetweenVectors(
        to2D(vec(rShoulder, rHip)),
        to2D(vec(rShoulder, rElbow)),
      )

      // Elbow straightness (Calculated in 3D to detect bends in any direction)
      const leftElbowAngle = angleBetweenVectors(
        vec(lElbow, lShoulder),
        vec(lElbow, lWrist),
      )
      const rightElbowAngle = angleBetweenVectors(
        vec(rElbow, rShoulder),
        vec(rElbow, rWrist),
      )

      const leftArmTooLow = leftArmAngle < ARM_ANGLE_MIN
      const rightArmTooLow = rightArmAngle < ARM_ANGLE_MIN
      const leftArmTooHigh = leftArmAngle > ARM_ANGLE_MAX
      const rightArmTooHigh = rightArmAngle > ARM_ANGLE_MAX
      const leftElbowBent = leftElbowAngle < ELBOW_STRAIGHTNESS_MIN
      const rightElbowBent = rightElbowAngle < ELBOW_STRAIGHTNESS_MIN

      if (leftArmTooLow || rightArmTooLow || leftArmTooHigh || rightArmTooHigh || leftElbowBent || rightElbowBent) {
        issues.add('MISALIGNED')
      }
    } else {
      // Arms not fully visible. Just valid "OUT OF FRAME".
      // Can't reliably say misaligned.
    }

    if (issues.size > 0) {
      // Prioritize logic:
      // If both -> "MISALIGNED • OUT OF FRAME"
      // If just one -> That one.
      const issueList = Array.from(issues)
      let feedback = ''

      if (issues.has('MISALIGNED') && issues.has('OUT OF FRAME')) {
        feedback = 'MISALIGNED • OUT OF FRAME'
      } else if (issues.has('OUT OF FRAME')) {
        feedback = 'OUT OF FRAME'
      } else if (issues.has('MISALIGNED')) {
        feedback = 'MISALIGNED'
      } else {
        feedback = issueList.join(' • ')
      }

      return {
        isAPose: false,
        confidence: 0,
        feedback: feedback,
      }
    }

    // All checks passed
    return {
      isAPose: true,
      confidence: 1,
      feedback: 'HOLD STILL',
    }
  }

  close(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.ready = false
  }
}
