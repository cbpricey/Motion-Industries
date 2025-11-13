import pandas as pd
from feature_engineer import analyze_image, compute_filename_features
from elasticsearch import Elasticsearch
import requests
import os

es = Elasticsearch("http://localhost:9200")

index_name = "feedback"
scroll_timeout = "5m"
batch_size = 200

IMAGES_DIR = "Output/Images"
os.makedirs(IMAGES_DIR, exist_ok=True)
DATASET_CSV = "Output/images_with_features_new.csv"

# === Start scroll search ===
page = es.search(
    index=index_name,
    scroll=scroll_timeout,
    size=batch_size,
    body={"query": {"match_all": {}}}
)

scroll_id = page["_scroll_id"]
total_downloaded = 0

while True:
    hits = page["hits"]["hits"]
    if not hits:
        break

    for doc in hits:
        source = doc["_source"]
        image_url = source.get("PRIMARY_IMAGE")

        if not image_url:
            continue  # skip if no image field

        try:
            # Can still get filename features from url even if we can't download the image
            mfr_similarity = compute_filename_features(image_url, source.get("MFR_NAME"))

            # Filename will be ES _id of the original document in image_metadata
            filename = f"{source.get("original_id")}.jpg"
            filepath = os.path.join(IMAGES_DIR, filename)

            if os.path.exists(filepath):
                print(f"Skipped (already exists): {filepath}")
                resolution, entropy, sharpness, brightness, white_ratio, white_border_ratio = analyze_image(filepath)
            else:
                response = requests.get(image_url, timeout=10)
                if response.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                
                    resolution, entropy, sharpness, brightness, white_ratio, white_border_ratio = analyze_image(filepath)
                else:
                    print(f"Skipped {filename} (HTTP {response.status_code})")

            data = {
                "[<ID>]": source.get("[<ID>]"),
                "MFR_NAME": source.get("MFR_NAME"),
                "PRIMARY_IMAGE": source.get("PRIMARY_IMAGE"),
                "MFRSimilarity": mfr_similarity,
                "Entropy": entropy,
                "Sharpness": sharpness,
                "Resolution": resolution,
                "Brightness": brightness,
                "Label": source.get("Label"),
                "WhiteRatio": white_ratio,
                "WhiteBorderRatio": white_border_ratio
            }
            df_new = pd.DataFrame(data, index=[0])

            # Append mode, don't overwrite
            df_new.to_csv(DATASET_CSV, mode='a', index=False, header=not os.path.exists(DATASET_CSV))

        except Exception as e:
            print(f"Failed to download {image_url}: {e}")

    # Next batch
    page = es.scroll(scroll_id=scroll_id, scroll=scroll_timeout)
    scroll_id = page["_scroll_id"]

# Clear scroll context
es.clear_scroll(scroll_id=scroll_id)