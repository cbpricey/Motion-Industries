import logging
import os
import cv2
from skimage import measure
from rapidfuzz import fuzz
from tqdm import tqdm

def compute_filename_features(filename, item_number, manufacturer):
    """Compute string similarity features from filename."""
    fname = os.path.splitext(os.path.basename(filename))[0].lower()

    # Binary item number match (does item no. appear as substring in filename or not?)
    item_match = 1 if str(item_number).lower() in fname else 0

    # Fuzzy manufacturer match
    manufacturer_clean = str(manufacturer).replace("(", "").replace(")", "")
    manufacturer_similarity = fuzz.token_set_ratio(manufacturer_clean.lower(), fname)

    return item_match, manufacturer_similarity
    
def analyze_image(image_path, logger=None):
    """Return resolution, entropy, sharpness, and brightness for one image."""
    
    # Only process these file types
    # allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    # ext = os.path.splitext(image)[-1].lower()
    # if ext not in allowed_exts:
    #     return None, None, None, None

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
            logger.error(f"[{image_path}] Entropy calculation failed: {e}")
            entropy = None
        try:
            sharpness = cv2.Laplacian(image_gray, cv2.CV_64F).var()
        except Exception as e:
            logger.error(f"[{image_path}] Sharpness calculation failed: {e}")
            sharpness = None
        try:
            brightness = float(image_gray.mean())
        except Exception as e:
            logger.error(f"[{image_path}] Brightness calculation failed: {e}")
            brightness = None
    except Exception:
        logger.error(f"Error processing {image_path}: {e}")
        return None, None, None, None
    
    return resolution, entropy, sharpness, brightness