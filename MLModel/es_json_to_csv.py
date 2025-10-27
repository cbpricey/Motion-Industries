import json
import csv
import os
from pathlib import Path
import re
import requests
from urllib.parse import urlparse

INPUT_PATH = "../../rejected.json"
OUTPUT_DIR = "Output"                           # Output CSV dir
os.makedirs(OUTPUT_DIR, exist_ok=True)          # Create output dir if it doesn't already exist                    
OUTPUT_CSV_PATH = os.path.join(OUTPUT_DIR, "image_metadata.csv") # Output CSV file name
IMAGES_DIR = OUTPUT_DIR + "/Images"
os.makedirs(IMAGES_DIR, exist_ok=True)
LOG_FILE = Path(OUTPUT_DIR) / "image_download_exceptions.log"


with open(INPUT_PATH, "r", encoding="utf-8") as f:
    raw_text = f.read()

# 1. Replace invalid triple quotes with regular quotes
raw_text = raw_text.replace('"""', '"')

# 2. Escape unescaped double quotes inside string values that are likely problematic
#    (only within part_number fields or similar)
raw_text = re.sub(r'"part_number"\s*:\s*.*?,\s*\n', '', raw_text)

# 3. Try parsing JSON safely
try:
    data = json.loads(raw_text)
except json.JSONDecodeError as e:
    raise ValueError(f"JSON parsing failed even after sanitization: {e}")

hits = data.get("hits", {}).get("hits", [])

# Define output fields and mapping
fields = {
    "sku_number": "[<ID>]",
    "item_number": "ITEM_NO",
    "manufacturer": "MFR_NAME",
    "image_url": "PRIMARY IMAGE",
}

# Write to CSV 
with open(OUTPUT_CSV_PATH, "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["[<ID>]", "ITEM_NO", "MFR_NAME", "PRIMARY IMAGE"])

    for h in hits:
        src = h.get("_source", {})
        sku = src.get("sku_number")
        item_no = src.get("item_number")
        manufacturer = src.get("manufacturer")
        image_url = src.get("image_url")
        # Use end of image_url as filename
        parsed_url = urlparse(image_url)
        filename = os.path.basename(parsed_url.path)
        success = True

        # Download image from image_url
        try:
            # Default request (no headers)
            response = requests.get(image_url, timeout=10)

            # Retry with headers if forbidden
            if response.status_code == 403:
                headers = {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0 Safari/537.36"
                    ),
                    "Referer": "https://www.google.com/",
                    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                }
                response = requests.get(image_url, headers=headers, timeout=10)

            response.raise_for_status()

            filepath = Path(IMAGES_DIR) / filename

            with open(filepath, "wb") as img_file:
                img_file.write(response.content)

            # print(filepath)
        except Exception as e:
            with open(LOG_FILE, "a", encoding="utf-8") as log:
                log.write(f"Failed to download image for SKU={sku}, URL={image_url}\n")
                log.write(f"Error: {e}\n\n")
            success = False
        
        writer.writerow([sku, item_no, manufacturer, filename, success])

print(f"CSV created successfully: {OUTPUT_CSV_PATH}")
