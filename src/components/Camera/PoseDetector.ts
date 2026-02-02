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

// MediaPipe landmark indices
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

// Head + toe framing check (full body must be in frame)
const FRAMING_LANDMARKS = [NOSE, LEFT_ANKLE, RIGHT_ANKLE]

// Arm pose landmarks (used for A-pose geometry)
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

// A-pose thresholds
const ARM_ANGLE_MIN = 20
const ARM_ANGLE_MAX = 60
const ELBOW_STRAIGHTNESS_MIN = 140
const VISIBILITY_THRESHOLD = 0.5

// Normalized coordinate bounds — landmark must be this far inside the frame
// to count as "in frame" (0.0 = edge, 1.0 = opposite edge)
const FRAME_MARGIN = 0.03
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
      return { isAPose: false, confidence: 0, feedback: 'Loading pose detector…' }
    }

    let result: PoseLandmarkerResult
    try {
      result = this.landmarker.detectForVideo(video, timestamp)
    } catch {
      return { isAPose: false, confidence: 0, feedback: 'Detection error' }
    }

    if (
      !result.worldLandmarks ||
      result.worldLandmarks.length === 0 ||
      !result.landmarks ||
      result.landmarks.length === 0
    ) {
      return { isAPose: false, confidence: 0, feedback: 'No person detected' }
    }

    const world = result.worldLandmarks[0]
    const normalized = result.landmarks[0]

    // Framing check: head and feet must actually be inside the frame
    // visibility alone is unreliable — MediaPipe predicts off-screen landmarks
    // with high visibility. Check normalized x,y are within bounds.
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
        const part = idx === NOSE ? 'head' : 'feet'
        return {
          isAPose: false,
          confidence: 0,
          feedback: `Step back — your ${part} must be in frame`,
        }
      }
    }

    // Arm landmark visibility + in-frame check
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
        return {
          isAPose: false,
          confidence: 0,
          feedback: 'Step back so shoulders and arms are visible',
        }
      }
    }

    // Compute arm angles using worldLandmarks for 3D accuracy
    const lShoulder = world[LEFT_SHOULDER]
    const rShoulder = world[RIGHT_SHOULDER]
    const lElbow = world[LEFT_ELBOW]
    const rElbow = world[RIGHT_ELBOW]
    const lWrist = world[LEFT_WRIST]
    const rWrist = world[RIGHT_WRIST]
    const lHip = world[LEFT_HIP]
    const rHip = world[RIGHT_HIP]

    // Arm angle: angle between shoulder→hip and shoulder→elbow
    const leftArmAngle = angleBetweenVectors(
      vec(lShoulder, lHip),
      vec(lShoulder, lElbow),
    )
    const rightArmAngle = angleBetweenVectors(
      vec(rShoulder, rHip),
      vec(rShoulder, rElbow),
    )

    // Elbow straightness: angle at elbow (shoulder-elbow-wrist)
    const leftElbowAngle = angleBetweenVectors(
      vec(lElbow, lShoulder),
      vec(lElbow, lWrist),
    )
    const rightElbowAngle = angleBetweenVectors(
      vec(rElbow, rShoulder),
      vec(rElbow, rWrist),
    )

    // Check arm angles
    const leftArmTooLow = leftArmAngle < ARM_ANGLE_MIN
    const rightArmTooLow = rightArmAngle < ARM_ANGLE_MIN
    const leftArmTooHigh = leftArmAngle > ARM_ANGLE_MAX
    const rightArmTooHigh = rightArmAngle > ARM_ANGLE_MAX

    if (leftArmTooLow || rightArmTooLow) {
      return {
        isAPose: false,
        confidence: 0.3,
        feedback: 'Raise arms slightly away from body',
      }
    }

    if (leftArmTooHigh || rightArmTooHigh) {
      return {
        isAPose: false,
        confidence: 0.3,
        feedback: 'Lower arms a bit — not quite a T-pose',
      }
    }

    // Check elbow straightness
    const leftElbowBent = leftElbowAngle < ELBOW_STRAIGHTNESS_MIN
    const rightElbowBent = rightElbowAngle < ELBOW_STRAIGHTNESS_MIN

    if (leftElbowBent || rightElbowBent) {
      return {
        isAPose: false,
        confidence: 0.5,
        feedback: 'Straighten your arms',
      }
    }

    // All checks passed
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2
    const idealCenter = (ARM_ANGLE_MIN + ARM_ANGLE_MAX) / 2
    const armConfidence = 1 - Math.abs(avgArmAngle - idealCenter) / idealCenter

    return {
      isAPose: true,
      confidence: Math.max(0, Math.min(1, armConfidence)),
      feedback: 'Hold still — capturing…',
    }
  }

  close(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.ready = false
  }
}
