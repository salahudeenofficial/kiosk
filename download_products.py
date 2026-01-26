import os
import requests
import time
from pathlib import Path
import urllib.parse

# Configuration
# Using the backend IP identified from recent tasks. 
# If this is incorrect, please update it to the active backend URL.
BASE_API_URL = "http://35.154.214.159:8000/api/products/list"
OUTPUT_DIR = "data"

def download_file(url, filepath):
    try:
        # Handle cases where URL might be relative or missing protocol
        if not url.startswith('http'):
            # This logic depends on where the images are hosted. 
            # Assuming they are on the same server if relative.
            base_domain = "http://35.154.214.159:8000"
            url = urllib.parse.urljoin(base_domain, url)

        resp = requests.get(url, stream=True, timeout=10)
        resp.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

def fetch_all_products():
    offset = 0
    limit = 50
    all_products = []
    
    print(f"Fetching product list from {BASE_API_URL}...")
    
    while True:
        try:
            params = {
                "limit": limit,
                "offset": offset
            }
            resp = requests.get(BASE_API_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            # The API response wrapper: { success: true, data: { products: [...], pagination: ... } }
            if not data.get("success"):
                print(f"API returned success=False: {data}")
                break
                
            result_data = data.get("data", {})
            products = result_data.get("products", [])
            
            if not products:
                print("No more products found.")
                break
                
            print(f"Fetched {len(products)} products (Offset: {offset})")
            all_products.extend(products)
            
            pagination = result_data.get("pagination", {})
            if not pagination.get("hasNext"):
                print("Reached last page.")
                break
                
            offset += limit
            time.sleep(0.5) 
            
        except Exception as e:
            print(f"Error fetching product list: {e}")
            break
            
    return all_products

def main():
    # Create base data directory
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # 1. Fetch all products
    products = fetch_all_products()
    print(f"Total products found: {len(products)}")
    
    success_count = 0
    skip_count = 0
    
    # 2. Organize and Download
    for p in products:
        try:
            pid = p.get("productId")
            name = p.get("name", "Unknown")
            image_url = p.get("imageUrl")
            
            category_data = p.get("category", {})
            gender = category_data.get("gender", "Unisex")
            category_name = category_data.get("name", "Uncategorized")
            
            # Sanitize names for folder paths
            gender_clean = gender.strip().capitalize() # Men, Women
            category_clean = "".join(c for c in category_name if c.isalnum() or c in (' ', '_', '-')).strip()
            
            # Structure: data/Gender/Category/productId.jpg
            save_dir = Path(OUTPUT_DIR) / gender_clean / category_clean
            save_dir.mkdir(parents=True, exist_ok=True)
            
            # Determine extension from URL if possible, default to jpg
            ext = "jpg"
            if image_url:
                parsed = urllib.parse.urlparse(image_url)
                path_ext = os.path.splitext(parsed.path)[1]
                if path_ext:
                    ext = path_ext.lstrip('.')
            
            filename = f"{pid}.{ext}"
            filepath = save_dir / filename
            
            if filepath.exists():
                print(f"Skipping {filename} (already exists)")
                skip_count += 1
                continue
                
            if not image_url:
                print(f"No image URL for product {pid}")
                continue
                
            print(f"Downloading {pid} ({gender_clean}/{category_clean})...")
            if download_file(image_url, filepath):
                success_count += 1
                
        except Exception as e:
            print(f"Error processing product {p.get('productId')}: {e}")
            
    print(f"\nDownload complete.")
    print(f"Downloaded: {success_count}")
    print(f"Skipped: {skip_count}")

if __name__ == "__main__":
    main()
