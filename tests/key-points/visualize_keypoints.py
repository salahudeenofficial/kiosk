import json
import sys
import cv2
import numpy as np

# --- Config ---
SCALE = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0  # e.g. 0.5 for half res

# Load image and keypoints
img = cv2.imread("tests/key-points/000_nobg.png", cv2.IMREAD_UNCHANGED)
with open("tests/key-points/000_nobg_keypoints.json") as f:
    data = json.load(f)

orig_h, orig_w = img.shape[:2]
kps = data["people"][0]["pose_keypoints_2d"]

# --- Resize image (simulating backend downscale) ---
new_w = int(orig_w * SCALE)
new_h = int(orig_h * SCALE)
img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

# Scale ratio: keypoints were detected on original resolution
# so we need to map them to the new resolution
scale_x = new_w / orig_w
scale_y = new_h / orig_h

print(f"Original: {orig_w}x{orig_h}")
print(f"Resized:  {new_w}x{new_h} (scale={SCALE})")
print(f"Scale factors: x={scale_x:.4f}, y={scale_y:.4f}")


def get_kp(index):
    """Extract (x, y, confidence) scaled to current image resolution."""
    i = index * 3
    return kps[i] * scale_x, kps[i + 1] * scale_y, kps[i + 2]


# --- Extract relevant keypoints ---
neck = get_kp(1)
r_shoulder = get_kp(2)
l_shoulder = get_kp(5)
mid_hip = get_kp(8)
r_hip = get_kp(9)
l_hip = get_kp(12)

neck_pt = np.array([neck[0], neck[1]])
mid_hip_pt = np.array([mid_hip[0], mid_hip[1]])
torso_vec = mid_hip_pt - neck_pt

# --- Shoulder (direct) ---
shoulder_left = (int(l_shoulder[0]), int(l_shoulder[1]))
shoulder_right = (int(r_shoulder[0]), int(r_shoulder[1]))
shoulder_width = abs(l_shoulder[0] - r_shoulder[0])

# --- Chest (estimated ~30% down neck->midhip) ---
chest_center = neck_pt + 0.30 * torso_vec
hip_width = abs(l_hip[0] - r_hip[0])
chest_width = shoulder_width * 0.85 + hip_width * 0.15
chest_left = (int(chest_center[0] - chest_width / 2), int(chest_center[1]))
chest_right = (int(chest_center[0] + chest_width / 2), int(chest_center[1]))

# --- Waist (estimated ~68% down neck->midhip) ---
waist_center = neck_pt + 0.68 * torso_vec
waist_width = shoulder_width * 0.25 + hip_width * 0.75
waist_width *= 0.88
waist_left = (int(waist_center[0] - waist_width / 2), int(waist_center[1]))
waist_right = (int(waist_center[0] + waist_width / 2), int(waist_center[1]))

# --- Scale-aware drawing params ---
LINE_THICKNESS = max(1, int(4 * SCALE))
DOT_RADIUS = max(2, int(6 * SCALE))
FONT_SCALE = max(0.3, 0.7 * SCALE)
FONT_THICK = max(1, int(2 * SCALE))

# --- Prepare canvas ---
has_alpha = img.shape[2] == 4
if has_alpha:
    alpha = img[:, :, 3]
    canvas = img[:, :, :3].copy()
else:
    canvas = img.copy()

# Colors (BGR)
COLOR_SHOULDER = (255, 191, 0)
COLOR_CHEST = (53, 107, 255)
COLOR_WAIST = (0, 252, 124)

# --- Draw shoulder line ---
cv2.line(canvas, shoulder_right, shoulder_left, COLOR_SHOULDER, LINE_THICKNESS)
cv2.circle(canvas, shoulder_right, DOT_RADIUS, COLOR_SHOULDER, -1)
cv2.circle(canvas, shoulder_left, DOT_RADIUS, COLOR_SHOULDER, -1)
cv2.putText(canvas, "Shoulder", (shoulder_left[0] + 5, shoulder_left[1] - 8),
            cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE, COLOR_SHOULDER, FONT_THICK)

# --- Draw chest line ---
cv2.line(canvas, chest_left, chest_right, COLOR_CHEST, LINE_THICKNESS)
cv2.circle(canvas, chest_left, DOT_RADIUS, COLOR_CHEST, -1)
cv2.circle(canvas, chest_right, DOT_RADIUS, COLOR_CHEST, -1)
cv2.putText(canvas, "Chest", (chest_right[0] + 5, chest_right[1] - 8),
            cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE, COLOR_CHEST, FONT_THICK)

# --- Draw waist line ---
cv2.line(canvas, waist_left, waist_right, COLOR_WAIST, LINE_THICKNESS)
cv2.circle(canvas, waist_left, DOT_RADIUS, COLOR_WAIST, -1)
cv2.circle(canvas, waist_right, DOT_RADIUS, COLOR_WAIST, -1)
cv2.putText(canvas, "Waist", (waist_right[0] + 5, waist_right[1] - 8),
            cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE, COLOR_WAIST, FONT_THICK)

# --- Reference skeleton ---
SKELETON_COLOR = (180, 180, 180)
SKELETON_THICK = max(1, int(1 * SCALE))
neck_i = (int(neck[0]), int(neck[1]))
midhip_i = (int(mid_hip[0]), int(mid_hip[1]))
cv2.line(canvas, neck_i, shoulder_right, SKELETON_COLOR, SKELETON_THICK)
cv2.line(canvas, neck_i, shoulder_left, SKELETON_COLOR, SKELETON_THICK)
cv2.line(canvas, neck_i, midhip_i, SKELETON_COLOR, SKELETON_THICK)
cv2.line(canvas, midhip_i, (int(r_hip[0]), int(r_hip[1])), SKELETON_COLOR, SKELETON_THICK)
cv2.line(canvas, midhip_i, (int(l_hip[0]), int(l_hip[1])), SKELETON_COLOR, SKELETON_THICK)

# --- Legend ---
legend_y = int(30 * SCALE)
legend_step = int(30 * SCALE)
for label, color in [("Shoulder", COLOR_SHOULDER), ("Chest", COLOR_CHEST), ("Waist", COLOR_WAIST)]:
    box_size = max(4, int(10 * SCALE))
    cv2.rectangle(canvas, (8, legend_y - box_size), (8 + box_size * 2, legend_y + box_size // 2), color, -1)
    cv2.putText(canvas, label, (8 + box_size * 2 + 5, legend_y + 2),
                cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE * 0.85, color, FONT_THICK)
    legend_y += legend_step

# --- Save output ---
if has_alpha:
    output = np.dstack([canvas, alpha])
else:
    output = canvas

suffix = f"_{int(SCALE * 100)}pct" if SCALE != 1.0 else ""
output_path = f"tests/key-points/000_keypoint_visualization{suffix}.png"
cv2.imwrite(output_path, output)

print(f"\nSaved to {output_path}")
print(f"Shoulder: {shoulder_right} -> {shoulder_left}")
print(f"Chest:    {chest_left} -> {chest_right}")
print(f"Waist:    {waist_left} -> {waist_right}")
