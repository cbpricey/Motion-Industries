import os
import logging
import cv2
import numpy as np
import pandas as pd
from skimage import measure
from rapidfuzz import fuzz
from tqdm import tqdm

# === CONFIGURATION ===
CSV_PATH = "Output/images_with_features3.csv"          # CSV of image filenames + corresponding manufacturers and item no's
IMAGE_DIR = "Output/Images"                    # Directory containing image files
IMAGE_COLUMN = "PRIMARY_IMAGE"                  # Name of column containing image filenames,
MFR_COLUMN = "MFR_NAME"                         # manufacturer names
OUTPUT_DIR = "Output"                           # Output CSV and log saved here
os.makedirs(OUTPUT_DIR, exist_ok=True)          # Create output dir if it doesn't already exist                    
OUTPUT_CSV_PATH = os.path.join(OUTPUT_DIR, "images_with_features_new.csv") # Output CSV file name
LOG_PATH = os.path.join(OUTPUT_DIR, "exceptions.log") # Any exceptions are logged in this file

# === LOGGING SETUP ===
logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# === WHITENESS THRESHOLDS (tune as needed) ===
# OpenCV HSV ranges: H in [0,179], S,V in [0,255]
WHITE_S_MAX = 25      # white should be low saturation
WHITE_V_MIN = 225     # white should be very bright
WHITE_RGB_MIN = 200   # optional extra guard: each RGB channel fairly high
ALPHA_VISIBLE_MIN = 250  # for PNGs: treat alpha >= 250 as visible pixel
BORDER_FRAC = 0.05    # examine a 5% border band for WhiteBorderRatio

def compute_filename_features(filename, manufacturer):
    """Compute string similarity features from filename."""
    fname = os.path.splitext(os.path.basename(filename))[0].lower()

    # Fuzzy manufacturer match
    manufacturer_clean = str(manufacturer).replace("(", "").replace(")", "")
    manufacturer_similarity = fuzz.token_set_ratio(manufacturer_clean.lower(), fname)

    return manufacturer_similarity

def compute_white_ratio(
    image_bgr: np.ndarray,
    s_max: int = WHITE_S_MAX, #How much color a pixel can have and still count as white. Lower = stricter (only near-gray counts); higher = more tolerant (light pastels may count).
    v_min: int = WHITE_V_MIN, #How bright a pixel must be to count as white. Higher = stricter (only very bright counts).
    rgb_min: int = WHITE_RGB_MIN, #Extra guard so each R, G, and B channel must be high (prevents bright colored pixels).
    alpha_visible_min: int = ALPHA_VISIBLE_MIN,
    border_frac: float = BORDER_FRAC, #Thickness of the border ring we analyze for WhiteBorderRatio, as a fraction of the shorter image side.
):
    """
    Returns (white_ratio, white_border_ratio) in [0,1] or (None, None) on failure.
    - White ≈ low S, high V, and high RGB channels.
    - Ignores fully transparent pixels (PNGs).
    - Border ratio computed over a thin ring (border_frac of min(H,W)).
    """
    try:
        h, w = image_bgr.shape[:2]

        # Handle alpha if present
        if image_bgr.shape[2] == 4:
            bgr = image_bgr[:, :, :3]
            alpha = image_bgr[:, :, 3]
            visible_mask = (alpha >= alpha_visible_min)
        else:
            bgr = image_bgr
            visible_mask = np.ones((h, w), dtype=bool)

        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        H, S, V = cv2.split(hsv)
        B, G, R = cv2.split(bgr)

        white_mask = (S <= s_max) & (V >= v_min) & (R >= rgb_min) & (G >= rgb_min) & (B >= rgb_min)
        white_mask &= visible_mask
        denom = np.count_nonzero(visible_mask)
        if denom == 0:
            return None, None

        white_ratio = float(np.count_nonzero(white_mask)) / float(denom)

        # Border ring
        bw = max(1, int(border_frac * min(h, w)))
        border_mask = np.zeros((h, w), dtype=bool)
        border_mask[:bw, :] = True
        border_mask[-bw:, :] = True
        border_mask[:, :bw] = True
        border_mask[:, -bw:] = True

        border_visible = border_mask & visible_mask
        border_denom = np.count_nonzero(border_visible)
        if border_denom == 0:
            white_border_ratio = None
        else:
            white_border_ratio = float(np.count_nonzero(white_mask & border_visible)) / float(border_denom)

        return white_ratio, white_border_ratio
    except Exception as e:
        logging.error(f"[compute_white_ratio] Failed: {e}")
        return None, None

    
def analyze_image(image_path):
    """Return resolution, entropy, sharpness, brightness, white_ratio, white_border_ratio for one image."""
    if not os.path.exists(image_path):
        return None, None, None, None, None, None
    
    # Only process these file types
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    ext = os.path.splitext(image_path)[-1].lower()
    if ext not in allowed_exts:
        return None, None, None, None, None, None

    try:
        image_bgr = cv2.imread(image_path)
        if image_bgr is None:
            return None, None, None, None, None, None
        
        # Normalize channels to at least 3 (ignore alpha for grayscale ops)
        if image_bgr.ndim == 2:  # single channel
            image_bgr = cv2.cvtColor(image_bgr, cv2.COLOR_GRAY2BGR)
        elif image_bgr.shape[2] == 1:
            image_bgr = cv2.cvtColor(image_bgr, cv2.COLOR_GRAY2BGR)


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
        try:
            white_ratio, white_border_ratio = compute_white_ratio(image_bgr)
        except Exception as e:
            logging.error(f"[{image_path}] White ratio and/or border calculation failed: {e}")
            white_ratio, white_border_ratio = None

    except Exception:
        logging.error(f"Error processing {image_path}: {e}")
        return None, None, None, None, None, None
    
    return resolution, entropy, sharpness, brightness, white_ratio, white_border_ratio
    
def main():
    df = pd.read_csv(CSV_PATH)

    # Add empty columns for new metrics
    df["MFRSimilarity"] = None
    df["Entropy"] = None
    df["Sharpness"] = None
    df["Resolution"] = None
    df["Brightness"] = None
    df["WhiteRatio"] = None
    df["WhiteBorderRatio"] = None

    print(f"Processing {len(df)} images...")

    for idx, row in tqdm(df.iterrows(), total=len(df)):
        filename = row[IMAGE_COLUMN]
        mfr = row[MFR_COLUMN]
        image_path = os.path.join(IMAGE_DIR, str(filename))

        mfr_similarity = compute_filename_features(filename, mfr)
        resolution, entropy, sharpness, brightness, white_ratio, white_border_ratio = analyze_image(image_path)
        # print(resolution, entropy, sharpness, brightness)

        df.at[idx, "MFRSimilarity"] = mfr_similarity
        df.at[idx, "Entropy"] = entropy
        df.at[idx, "Sharpness"] = sharpness
        df.at[idx, "Resolution"] = resolution
        df.at[idx, "Brightness"] = brightness
        df.at[idx, "WhiteRatio"] = white_ratio
        df.at[idx, "WhiteBorderRatio"] = white_border_ratio

    # Save results
    print(df.head())
    df.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"\nFinished processing, results saved to '{OUTPUT_CSV_PATH}'")


if __name__ == "__main__":
    main()