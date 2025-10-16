import os
import logging
import cv2
import pandas as pd
from skimage import measure
from rapidfuzz import fuzz
from tqdm import tqdm

# === CONFIGURATION ===
CSV_PATH = "Image_Cross_Reference.csv"          # CSV of image filenames + corresponding manufacturers and item no's
IMAGE_DIR = "../../Capstone"                    # Directory containing image files
IMAGE_COLUMN = "PRIMARY_IMAGE"                  # Name of column containing image filenames,
MFR_COLUMN = "MFR_NAME"                         # manufacturer names,
ITEM_NO_COLUMN = "ITEM_NO"                      # item numbers
OUTPUT_DIR = "Output"                           # Output CSV and log saved here
os.makedirs(OUTPUT_DIR, exist_ok=True)          # Create output dir if it doesn't already exist                    
OUTPUT_CSV_PATH = os.path.join(OUTPUT_DIR, "images_with_features.csv") # Output CSV file name
LOG_PATH = os.path.join(OUTPUT_DIR, "exceptions.log") # Any exceptions are logged in this file

# === LOGGING SETUP ===
logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


def compute_filename_features(filename, item_number, manufacturer):
    """Compute string similarity features from filename."""
    fname = os.path.splitext(os.path.basename(filename))[0].lower()

    # Binary item number match (does item no. appear as substring in filename or not?)
    item_match = 1 if str(item_number).lower() in fname else 0

    # Fuzzy manufacturer match
    manufacturer_clean = str(manufacturer).replace("(", "").replace(")", "")
    manufacturer_similarity = fuzz.token_set_ratio(manufacturer_clean.lower(), fname)

    return item_match, manufacturer_similarity
    
def analyze_image(image_path):
    """Return resolution, entropy, sharpness, and brightness for one image."""
    if not os.path.exists(image_path):
        return None, None, None, None

    try:
        image_bgr = cv2.imread(image_path)
        if image_bgr is None:
            return None, None, None, None

        height, width = image_bgr.shape[:2]
        resolution = width * height

        # Convert to grayscale, easier to process and shouldn't make a difference
        image_gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

        try:
            entropy = measure.shannon_entropy(image_gray)
        except Exception as e:
            logging.error(f"[{image_path}] Entropy calculation failed: {e}")
            entropy = None
        try:
            sharpness = cv2.Laplacian(image_gray, cv2.CV_64F).var()
        except Exception as e:
            logging.error(f"[{image_path}] Sharpness calculation failed: {e}")
            sharpness = None
        try:
            brightness = float(image_gray.mean())
        except Exception as e:
            logging.error(f"[{image_path}] Brightness calculation failed: {e}")
            brightness = None
    except Exception:
        logging.error(f"Error processing {image_path}: {e}")
        return None, None, None, None
    
    return resolution, entropy, sharpness, brightness
    
def main():
    df = pd.read_csv(CSV_PATH)

    # Add empty columns for new metrics
    df["ItemNoMatch"] = None
    df["MFRSimilarity"] = None
    df["Entropy"] = None
    df["Sharpness"] = None
    df["Resolution"] = None
    df["Brightness"] = None

    print(f"Processing {len(df)} images...")

    for idx, row in tqdm(df.iterrows(), total=len(df)):
        filename = row[IMAGE_COLUMN]
        item_no = row[ITEM_NO_COLUMN]
        mfr = row[MFR_COLUMN]
        image_path = os.path.join(IMAGE_DIR, str(filename))

        item_match, mfr_similarity = compute_filename_features(filename, item_no, mfr)
        resolution, entropy, sharpness, brightness = analyze_image(image_path)
        # print(resolution, entropy, sharpness, brightness)

        df.at[idx, "ItemNoMatch"] = item_match
        df.at[idx, "MFRSimilarity"] = mfr_similarity
        df.at[idx, "Entropy"] = entropy
        df.at[idx, "Sharpness"] = sharpness
        df.at[idx, "Resolution"] = resolution
        df.at[idx, "Brightness"] = brightness

    # Save results
    print(df.head())
    df.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"\nFinished processing, results saved to '{OUTPUT_CSV_PATH}'")


if __name__ == "__main__":
    main()