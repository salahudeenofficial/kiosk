"""
MediaPipe Pose Landmarker (tasks API v0.10+) — Shoulder/Chest/Waist visualization.

MediaPipe Pose detects 33 landmarks. Relevant for fitcheck:
  11 = LEFT_SHOULDER     12 = RIGHT_SHOULDER
  23 = LEFT_HIP          24 = RIGHT_HIP

Chest & Waist are estimated from these anchor points.

Usage:
  python3 tests/key-points/mediapipe_keypoints.py [image_path ...]
"""

import sys
import os
import cv2
import numpy as np
import mediapipe as mp

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_heavy.task")

# Colors (BGR)
COLOR_SHOULDER = (255, 191, 0)   # Cyan
COLOR_CHEST    = (53, 107, 255)  # Orange
COLOR_WAIST    = (0, 252, 124)   # Green
SKELETON_COLOR = (180, 180, 180)

# Landmark indices
L_SHOULDER = 11
R_SHOULDER = 12
L_HIP = 23
R_HIP = 24


def detect_and_visualize(image_path, output_dir):
    img = cv2.imread(image_path)
    if img is None:
        print(f"  SKIP: Could not read {image_path}")
        return

    h, w = img.shape[:2]
    canvas = img.copy()

    # MediaPipe tasks API expects mp.Image
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        result = landmarker.detect(mp_image)

    if not result.pose_landmarks or len(result.pose_landmarks) == 0:
        print(f"  SKIP: No pose detected in {image_path}")
        return

    lm = result.pose_landmarks[0]  # first person

    # Extract keypoints (normalized 0-1 -> pixel coords)
    def kp(idx):
        return lm[idx].x * w, lm[idx].y * h, lm[idx].visibility

    l_sh = kp(L_SHOULDER)
    r_sh = kp(R_SHOULDER)
    l_hp = kp(L_HIP)
    r_hp = kp(R_HIP)

    print(f"  L_Shoulder: ({l_sh[0]:.0f}, {l_sh[1]:.0f}) vis={l_sh[2]:.2f}")
    print(f"  R_Shoulder: ({r_sh[0]:.0f}, {r_sh[1]:.0f}) vis={r_sh[2]:.2f}")
    print(f"  L_Hip:      ({l_hp[0]:.0f}, {l_hp[1]:.0f}) vis={l_hp[2]:.2f}")
    print(f"  R_Hip:      ({r_hp[0]:.0f}, {r_hp[1]:.0f}) vis={r_hp[2]:.2f}")

    # --- Derived points ---
    neck = np.array([(l_sh[0] + r_sh[0]) / 2, (l_sh[1] + r_sh[1]) / 2])
    mid_hip = np.array([(l_hp[0] + r_hp[0]) / 2, (l_hp[1] + r_hp[1]) / 2])
    torso_vec = mid_hip - neck

    shoulder_width = abs(l_sh[0] - r_sh[0])
    hip_width = abs(l_hp[0] - r_hp[0])

    # Shoulder — direct
    sh_left = (int(l_sh[0]), int(l_sh[1]))
    sh_right = (int(r_sh[0]), int(r_sh[1]))

    # Chest — 30% down torso
    chest_center = neck + 0.30 * torso_vec
    chest_width = shoulder_width * 0.85 + hip_width * 0.15
    chest_left = (int(chest_center[0] - chest_width / 2), int(chest_center[1]))
    chest_right = (int(chest_center[0] + chest_width / 2), int(chest_center[1]))

    # Waist — 68% down torso
    waist_center = neck + 0.68 * torso_vec
    waist_width = (shoulder_width * 0.25 + hip_width * 0.75) * 0.88
    waist_left = (int(waist_center[0] - waist_width / 2), int(waist_center[1]))
    waist_right = (int(waist_center[0] + waist_width / 2), int(waist_center[1]))

    # --- Scale-aware drawing ---
    scale = min(w, h) / 1024
    thick = max(2, int(4 * scale))
    dot_r = max(3, int(6 * scale))
    font_s = max(0.4, 0.7 * scale)
    font_t = max(1, int(2 * scale))

    # Shoulder
    cv2.line(canvas, sh_left, sh_right, COLOR_SHOULDER, thick)
    cv2.circle(canvas, sh_left, dot_r, COLOR_SHOULDER, -1)
    cv2.circle(canvas, sh_right, dot_r, COLOR_SHOULDER, -1)
    cv2.putText(canvas, "Shoulder", (max(sh_left[0], sh_right[0]) + 8, sh_left[1] - 8),
                cv2.FONT_HERSHEY_SIMPLEX, font_s, COLOR_SHOULDER, font_t)

    # Chest
    cv2.line(canvas, chest_left, chest_right, COLOR_CHEST, thick)
    cv2.circle(canvas, chest_left, dot_r, COLOR_CHEST, -1)
    cv2.circle(canvas, chest_right, dot_r, COLOR_CHEST, -1)
    cv2.putText(canvas, "Chest", (chest_right[0] + 8, chest_right[1] - 8),
                cv2.FONT_HERSHEY_SIMPLEX, font_s, COLOR_CHEST, font_t)

    # Waist
    cv2.line(canvas, waist_left, waist_right, COLOR_WAIST, thick)
    cv2.circle(canvas, waist_left, dot_r, COLOR_WAIST, -1)
    cv2.circle(canvas, waist_right, dot_r, COLOR_WAIST, -1)
    cv2.putText(canvas, "Waist", (waist_right[0] + 8, waist_right[1] - 8),
                cv2.FONT_HERSHEY_SIMPLEX, font_s, COLOR_WAIST, font_t)

    # Skeleton reference
    sk_t = max(1, int(1 * scale))
    neck_i = (int(neck[0]), int(neck[1]))
    midhip_i = (int(mid_hip[0]), int(mid_hip[1]))
    cv2.line(canvas, neck_i, sh_left, SKELETON_COLOR, sk_t)
    cv2.line(canvas, neck_i, sh_right, SKELETON_COLOR, sk_t)
    cv2.line(canvas, neck_i, midhip_i, SKELETON_COLOR, sk_t)
    cv2.line(canvas, midhip_i, (int(l_hp[0]), int(l_hp[1])), SKELETON_COLOR, sk_t)
    cv2.line(canvas, midhip_i, (int(r_hp[0]), int(r_hp[1])), SKELETON_COLOR, sk_t)

    # Legend
    ly = int(30 * scale)
    ls = int(30 * scale)
    for label, color in [("Shoulder", COLOR_SHOULDER), ("Chest", COLOR_CHEST), ("Waist", COLOR_WAIST)]:
        bs = max(4, int(10 * scale))
        cv2.rectangle(canvas, (8, ly - bs), (8 + bs * 2, ly + bs // 2), color, -1)
        cv2.putText(canvas, label, (8 + bs * 2 + 5, ly + 2),
                    cv2.FONT_HERSHEY_SIMPLEX, font_s * 0.85, color, font_t)
        ly += ls

    # Save
    base = os.path.splitext(os.path.basename(image_path))[0]
    out_path = os.path.join(output_dir, f"{base}_mediapipe_viz.png")
    cv2.imwrite(out_path, canvas)
    print(f"  Saved: {out_path}")
    return out_path


if __name__ == "__main__":
    output_dir = "tests/key-points/output"
    os.makedirs(output_dir, exist_ok=True)

    if len(sys.argv) > 1:
        images = sys.argv[1:]
    else:
        images = [
            "tests/images/input.jpg",
            "tests/images/vton_lightx2v_result.png",
            "tests/images/ComfyUI_00006_ (2).png",
        ]

    for img_path in images:
        print(f"\nProcessing: {img_path}")
        detect_and_visualize(img_path, output_dir)
