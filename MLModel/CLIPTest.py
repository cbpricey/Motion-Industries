import os
import torch
import clip
from PIL import Image
import numpy as np
import pandas as pd

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

CATEGORIESPATH = "Capstone Good Image Cross Reference.xlsx"
FILEPATH = "Bad.xlsx"
IMAGE_DIR = "Output/Images"                    # Directory containing image files
IMAGE_COLUMN = "PRIMARY_IMAGE"  
DESCRIPTION_COLUMN = "PGC_Description"

cdf = pd.read_excel(CATEGORIESPATH)
df = pd.read_excel(CATEGORIESPATH)

out_file = "Output/CLIP/output.txt"
out_dir = os.path.dirname(out_file)
os.makedirs(out_dir, exist_ok=True)

with open(out_file, "w") as f:
    counts = cdf["PGC"].value_counts()
    for x in counts:
        print(x, file=f)
    CATEGORIES = (
        cdf[["PGC", DESCRIPTION_COLUMN]]
        .drop_duplicates()
        .set_index("PGC")[DESCRIPTION_COLUMN]
        .to_dict()
    )
    print(CATEGORIES, file=f)

codes = list(CATEGORIES.keys())

# Convert category descriptions into CLIP text embeddings
with torch.no_grad():
    text_tokens = clip.tokenize(list(CATEGORIES.values())).to(device)
    text_embeddings = model.encode_text(text_tokens)
    text_embeddings = text_embeddings / text_embeddings.norm(dim=-1, keepdim=True)  # normalize

# classify an image using zero-shot CLIP
def classify_image(image_path: str, actual_code: int, threshold: float = 0.25) -> tuple[int, float]:
    """
    Returns:
        best_code  -> category code (or -1 if rejected)
        best_score -> cosine similarity score
    """

    if not os.path.exists(image_path):
        raise FileNotFoundError(image_path)

    # Load and preprocess image
    img = preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0).to(device)

    # Compute image embedding
    with torch.no_grad():
        img_emb = model.encode_image(img)
        img_emb = img_emb / img_emb.norm(dim=-1, keepdim=True)

    # Cosine similarity with each category text
    sims = (img_emb @ text_embeddings.T).cpu().numpy().flatten()

    sim_dict = {code: sims[i] for i, code in enumerate(codes)}
    # actual_sim_score = sim_dict[actual_code]
    actual_sim_score = 0

    # Get best category
    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])
    best_code = list(CATEGORIES.keys())[best_idx]

    # # Reject if similarity too low
    # if best_score < threshold:
    #     return -1, best_score

    return best_code, best_score, actual_sim_score

with open("Output/CLIP/results.txt", "w") as f:
    correct = 0
    sum = 0
    total = 0
    for row in df.itertuples():
        image_path = os.path.join(IMAGE_DIR, str(row.PRIMARY_IMAGE))
        try:
            actual_code = row.PGC
            code, score, actual_code_sim = classify_image(image_path, actual_code)
            actual_desc = row.PGC_Description

            if score > 0.0:
                sum += score
                total += 1
            
            if(code // 1000 == actual_code // 1000):
                correct += 1
            if code == -1:
                print(f"Rejected image. Best similarity = {score:.3f}. Actual: {actual_desc}, {actual_code}, {actual_code_sim}", file=f)
            else:
                print(f"Predicted category: {code}. Similarity score: {score:.3f}. Actual: {actual_desc}, {actual_code}, {actual_code_sim}", file=f)
        except Exception as e:
            print(e, file=f)

print(f"Accuracy: {correct/len(df)}")
print(f"Average: {sum/total}")