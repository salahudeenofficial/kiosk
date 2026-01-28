import os
import requests
import glob
from PIL import Image
from io import BytesIO
import time

# Configuration
API_URL = "http://82.141.118.37:24744/infer"
PROMPT = "place the garment on the person.Preserve texture and color of the garment"
OUTPUT_DIR = "prompt2"

# Data paths
BASE_DIR = "/home/fashionx/try_og_pipeline"
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")
GARMENTS_DIR = os.path.join(BASE_DIR, "garments")

def find_user_image(user_dir):
    """Find the main user image in a directory (excluding masks)."""
    if not os.path.exists(user_dir):
        return None
    
    candidates = []
    for file in os.listdir(user_dir):
        if file.lower().endswith(('.png', '.jpg', '.jpeg')):
            if 'mask' not in file.lower():
                candidates.append(os.path.join(user_dir, file))
    
    # Return the first one found, or None
    return candidates[0] if candidates else None

def get_garment_images(gender_dir):
    """Recursively find all garment images in a gender directory."""
    garments = []
    if not os.path.exists(gender_dir):
        return garments
        
    for root, dirs, files in os.walk(gender_dir):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                garments.append(os.path.join(root, file))
    return garments

def create_stitched_image(user_img_path, garment_img_path, result_img_bytes, output_path):
    try:
        user_img = Image.open(user_img_path).convert("RGB")
        garment_img = Image.open(garment_img_path).convert("RGB")
        result_img = Image.open(BytesIO(result_img_bytes)).convert("RGB")

        # Resize to same height for stitching
        target_height = 512
        
        def resize_img(img, h):
            ratio = h / img.height
            w = int(img.width * ratio)
            return img.resize((w, h))

        user_img = resize_img(user_img, target_height)
        garment_img = resize_img(garment_img, target_height)
        result_img = resize_img(result_img, target_height)

        total_width = user_img.width + garment_img.width + result_img.width
        new_img = Image.new("RGB", (total_width, target_height))
        
        current_x = 0
        new_img.paste(user_img, (current_x, 0))
        current_x += user_img.width
        new_img.paste(garment_img, (current_x, 0))
        current_x += garment_img.width
        new_img.paste(result_img, (current_x, 0))
        
        new_img.save(output_path)
    except Exception as e:
        print(f"Error creating stitched image for {output_path}: {e}")

def run_batch():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # specialized pairings
    # (Gender String in Path, Gender Folder in Garments)
    genders = [("men", "Men"), ("women", "Women")]
    
    all_tasks = []
    
    print("Scanning for tasks...")
    for user_gender_str, garment_gender_str in genders:
        user_base = os.path.join(USER_DATA_DIR, user_gender_str)
        garment_base = os.path.join(GARMENTS_DIR, garment_gender_str)
        
        # Find users
        if not os.path.exists(user_base):
            continue
            
        users = [d for d in os.listdir(user_base) if os.path.isdir(os.path.join(user_base, d))]
        
        # Find garments
        garments = get_garment_images(garment_base)
        
        for user_folder in users:
            user_path = os.path.join(user_base, user_folder)
            user_img = find_user_image(user_path)
            
            if not user_img:
                print(f"Warning: No valid user image found in {user_path}")
                continue
                
            for garment_img in garments:
                # Create a task
                task_name = f"{user_gender_str}_{user_folder}_{os.path.basename(os.path.dirname(garment_img))}_{os.path.basename(garment_img)}"
                # Sanitize task name
                task_name = "".join([c if c.isalnum() or c in ('-', '_') else '_' for c in task_name])
                
                all_tasks.append({
                    "name": task_name,
                    "user_image": user_img,
                    "garment_image": garment_img
                })

    total = len(all_tasks)
    print(f"Found {total} combinations to process.")
    
    for i, task in enumerate(all_tasks):
        print(f"[{i+1}/{total}] Processing {task['name']}...")
        
        output_filename = os.path.join(OUTPUT_DIR, f"{task['name']}.png")
        if os.path.exists(output_filename):
            print(f"  Skipping: Output already exists for {task['name']}")
            continue

        files = {
            "masked_user_image": open(task["user_image"], "rb"),
            "garment_image": open(task["garment_image"], "rb")
        }
        data = {
            "prompt": PROMPT,
            "seed": 42,
            "steps": 4,
            "cfg": 1.0
        }
        
        try:
            start_t = time.time()
            response = requests.post(API_URL, files=files, data=data, timeout=120)
            elapsed = time.time() - start_t
            
            if response.status_code == 200:
                print(f"  Success! ({elapsed:.2f}s)")
                create_stitched_image(task["user_image"], task["garment_image"], response.content, output_filename)
            else:
                print(f"  Failed: {response.status_code}")
                # Optional: print(response.text)
                
        except Exception as e:
            print(f"  Error: {e}")
        finally:
            files["masked_user_image"].close()
            files["garment_image"].close()

if __name__ == "__main__":
    run_batch()
