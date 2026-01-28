import os
import random
import requests
import base64
import time
from pathlib import Path
from PIL import Image
from io import BytesIO

# =================CONFIGURATION=================
BACKEND_URL = "http://82.141.118.37:32637"
ENDPOINT = "/infer"

# Prompts
PROMPT_LOWER = "将图片 1 中的绿色遮罩区域仅用于判断服装属于上半身或下半身，不要将服装限制在遮罩区域内。将图片 2 中的服装自然地穿戴到图片 1 中的人物身上，保持图片 2 中服装的完整形状、袖长和轮廓。无论图片 2 是单独的服装图还是人物穿着该服装的图，都要准确地转移服装，同时保留其材质质感、细节和颜色准确性。确保服装与人物的姿势自然贴合，光照与阴影真实，边缘平滑融合。"
PROMPT_UPPER = "High quality virtual try-on, upper body garment, photorealistic, intricate details, natural lighting, preserving garment texture and details."

# Path Classification Keywords
LOWER_KEYWORDS = ['pant', 'jeans', 'skirt', 'short', 'trousers', 'leggings', 'bottom', 'lower']
DRESS_KEYWORDS = ['dress', 'gown', 'suit', 'fullbody']

# Directories
BASE_DIR = Path(__file__).parent
GARMENTS_DIR = BASE_DIR / "garments"
USERS_DIR = BASE_DIR / "users"
OUTPUT_DIR = BASE_DIR / "output"
# ===============================================

def encode_image_check(image_path):
    if not os.path.exists(image_path):
        print(f"Error: File not found {image_path}")
        return None
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def classify_garment(filepath):
    # Check full path string for keywords since filenames might be just IDs
    path_str = str(filepath).lower()
    if any(k in path_str for k in LOWER_KEYWORDS):
        return 'lower'
    if any(k in path_str for k in DRESS_KEYWORDS):
        return 'dress'
    return 'upper'

def get_random_user(gender):
    """
    Finds a random user folder/files for the specified gender.
    Expects structure: users/men/user1/image.png
    """
    gender_dir = USERS_DIR / gender
    if not gender_dir.exists():
        print(f"Warning: No user directory found for {gender}")
        return None
    
    # 1. Find all user directories (folders inside men/women)
    user_dirs = [d for d in gender_dir.iterdir() if d.is_dir()]
    
    if not user_dirs:
        print(f"Warning: No user directories found in {gender_dir}")
        return None
        
    # 2. Pick a random user directory
    selected_user_dir = random.choice(user_dirs)
    
    # 3. Find images within this directory
    # Original: Any image that doesn't have "mask" in the name
    # Mask: Contains "lower_body_mask"
    
    images = list(selected_user_dir.glob("*.*"))
    original_img = None
    masked_img = None
    
    for img in images:
        if img.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp']:
            continue
            
        name = img.name.lower()
        if "lower_body_mask" in name:
            masked_img = img
        elif "mask" not in name:
            original_img = img
            
    if not original_img:
        print(f"Warning: No original image found in {selected_user_dir}")
        return None
        
    return {
        'original': original_img,
        'masked': masked_img
    }

def stitch_images(user_path, garment_path, result_img_bytes):
    """Stitch User | Garment | Result side-by-side"""
    img_user = Image.open(user_path).convert("RGB")
    img_garment = Image.open(garment_path).convert("RGB")
    img_result = Image.open(BytesIO(result_img_bytes)).convert("RGB")
    
    # Resize to match result height, maintaining aspect ratio
    target_h = img_result.height
    
    def resize_h(img, h):
        ratio = h / img.height
        return img.resize((int(img.width * ratio), h), Image.Resampling.LANCZOS)
        
    img_user_res = resize_h(img_user, target_h)
    img_garment_res = resize_h(img_garment, target_h)
    
    total_w = img_user_res.width + img_garment_res.width + img_result.width
    combined = Image.new("RGB", (total_w, target_h))
    
    combined.paste(img_user_res, (0, 0))
    combined.paste(img_garment_res, (img_user_res.width, 0))
    combined.paste(img_result, (img_user_res.width + img_garment_res.width, 0))
    
    return combined

def run_test():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Iterate through Men and Women garments
    for gender in ['men', 'women']:
        g_path = GARMENTS_DIR / gender
        if not g_path.exists():
            continue
            
        print(f"Processing {gender} garments...")
        
        # Use rglob to find all images recursively
        garments = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.webp']:
            garments.extend(list(g_path.rglob(ext)))
            
        for garment_file in garments:
            print(f"  Testing: {garment_file.name}")
            
            # 1. Classify using full path
            category = classify_garment(garment_file)
            print(f"    Category: {category}")
            
            # 2. Get User
            user_pair = get_random_user(gender)
            if not user_pair:
                print("    Skipping: No user found.")
                continue
                
            # 3. Path Logic
            input_image_path = None
            prompt = ""
            
            if category == 'lower':
                # PATH 2
                if user_pair['masked'] and user_pair['masked'].exists():
                    input_image_path = user_pair['masked']
                    prompt = PROMPT_LOWER
                    print("    Logic: Path 2 (Lower Body Masked)")
                else:
                    print(f"    Skipping: Lower garment but no lower_body_mask found for {user_pair['original'].name}")
                    continue
            else:
                # PATH 1 (Upper or Dress)
                input_image_path = user_pair['original']
                prompt = PROMPT_UPPER
                print("    Logic: Path 1 (Standard)")
            
            # 4. Prepare Payload (Multipart/Form-data)
            if not input_image_path or not os.path.exists(input_image_path):
                print(f"    Error: Input image path invalid: {input_image_path}")
                continue

            try:
                files = {
                    "masked_user_image": open(input_image_path, "rb"),
                    "garment_image": open(garment_file, "rb")
                }
                
                data = {
                    "prompt": prompt,
                    "category": category, # Optional
                    "seed": 42,
                    "steps": 4, # Fast testing
                    "cfg": 1.0
                }
                
                # 5. Send Request
                print(f"    Sending request to {BACKEND_URL}...")
                response = requests.post(f"{BACKEND_URL}{ENDPOINT}", files=files, data=data, timeout=120)
                
                if response.status_code == 200:
                    # Success - Response contains binary image content
                    result_bytes = response.content
                    
                    # 6. Stitch and Save
                    try:
                        final_img = stitch_images(user_pair['original'], garment_file, result_bytes)
                        
                        out_name = f"Test_{category}_{garment_file.stem}_{user_pair['original'].stem}.jpg"
                        final_img.save(OUTPUT_DIR / out_name)
                        print(f"    Success: Saved to {out_name}")
                    except Exception as img_err:
                        print(f"    Error stitching/saving image: {img_err}")
                else:
                    print(f"    Failed: API Error {response.status_code} - {response.text}")

            except Exception as e:
                print(f"    Error: {e}")
            finally:
                # Ensure files are closed
                if 'files' in locals():
                    for f in files.values():
                        f.close()
                
            time.sleep(1) # Polite delay

if __name__ == "__main__":
    run_test()
