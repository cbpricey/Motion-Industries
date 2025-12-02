
import os
import pandas as pd
import numpy as np
from PIL import Image
import torch
from transformers import AutoProcessor, AutoModel
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.manifold import TSNE
import joblib
import matplotlib.pyplot as plt
from tqdm import tqdm
import warnings
warnings.filterwarnings("ignore")

# -------------------------------
# CONFIG
# -------------------------------
GOOD_EXCEL = "Capstone Good Image Cross Reference.xlsx"
IMAGE_DIR = "Output/Images"
EMB_CACHE = "cache_siglip_embeddings.npy"
MODEL_SAVE = "siglip_pgc_classifier.pkl"
CENTROIDS_SAVE = "pgc_centroids.pkl"
MODEL_NAME = "google/siglip-base-patch16-256"

print("Loading SigLIP model...")
processor = AutoProcessor.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.eval()
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
print(f"Running on {device.upper()}")

# -------------------------------
# Extract embeddings (cached)
# -------------------------------
if os.path.exists(EMB_CACHE):
    print(f"Loading cached embeddings ({EMB_CACHE})")
    embeddings = np.load(EMB_CACHE)
    df_valid = pd.read_csv("cache_valid_rows.csv")
else:
    df = pd.read_excel(GOOD_EXCEL)
    print(f"Extracting embeddings from {len(df)} images...")
    embeddings = []
    valid_rows = []
    for _, row in tqdm(df.iterrows(), total=len(df)):
        img_path = os.path.join(IMAGE_DIR, str(row.PRIMARY_IMAGE))
        if not os.path.exists(img_path):
            continue
        try:
            image = Image.open(img_path).convert("RGB")
            inputs = processor(images=image, return_tensors="pt").to(device)
            with torch.no_grad():
                emb = model.get_image_features(**inputs)
                emb = emb / emb.norm(dim=-1, keepdim=True)
            embeddings.append(emb.cpu().numpy().flatten())
            valid_rows.append(row.to_dict())
        except:
            continue
    embeddings = np.stack(embeddings)
    df_valid = pd.DataFrame(valid_rows)
    np.save(EMB_CACHE, embeddings)
    df_valid.to_csv("cache_valid_rows.csv", index=False)
    print(f"Extracted & cached {len(embeddings)} embeddings")

# -------------------------------
# Train classifier
# -------------------------------
print("Training PGC classifier...")
le = LabelEncoder()
y = le.fit_transform(df_valid["PGC"].astype(str))

clf = LogisticRegression(
    multi_class='multinomial',
    max_iter=2000,
    class_weight='balanced',
    n_jobs=-1
)
clf.fit(embeddings, y)

joblib.dump(clf, MODEL_SAVE)
joblib.dump(le, "label_encoder.pkl")
print(f"→ Classifier saved: {MODEL_SAVE}")

# -------------------------------
# Build centroids
# -------------------------------
print("Building PGC centroids...")
centroids = {}
for pgc in df_valid["PGC"].unique():
    if (df_valid["PGC"] == pgc).sum() >= 3:
        mask = df_valid["PGC"] == pgc
        centroid = embeddings[mask].mean(axis=0)
        centroid /= np.linalg.norm(centroid)
        centroids[int(pgc)] = centroid

joblib.dump(centroids, CENTROIDS_SAVE)
print(f"→ {len(centroids)} reliable centroids saved: {CENTROIDS_SAVE}")

# -------------------------------
# Clustering map
# -------------------------------
print("Generating PGC visual similarity map...")
valid_pgcs = list(centroids.keys())
centroid_vectors = np.stack([centroids[p] for p in valid_pgcs])

tsne = TSNE(
    n_components=2,
    perplexity=min(30, len(valid_pgcs)-1),
    max_iter=1000,
    init='pca',
    learning_rate='auto',
    random_state=42
)
tsne_2d = tsne.fit_transform(centroid_vectors)

plt.figure(figsize=(16, 12))
scatter = plt.scatter(tsne_2d[:, 0], tsne_2d[:, 1], c=valid_pgcs, cmap='tab20', s=100)

for i, pgc in enumerate(valid_pgcs):
    desc = df_valid[df_valid['PGC'] == pgc]['PGC_Description'].iloc[0]
    short = " ".join(str(desc).split()[:5]) + "..." if len(str(desc).split()) > 5 else desc
    plt.text(tsne_2d[i, 0] + 1, tsne_2d[i, 1], f"{pgc}\n{short}", fontsize=9)

plt.colorbar(scatter, label="PGC Code")
plt.title("PGC Visual Similarity Map – What Your Products Actually Look Like", fontsize=18, pad=20)
plt.xlabel("t-SNE Dimension 1")
plt.ylabel("t-SNE Dimension 2")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("PGC_Visual_Clustering_Map.png", dpi=300, bbox_inches='tight')
plt.show()

print("\nDONE!")
print("Files created:")
print("  • siglip_pgc_classifier.pkl")
print("  • label_encoder.pkl")
print("  • pgc_centroids.pkl")
print("  • PGC_Visual_Clustering_Map.png")
print("  • cache_siglip_embeddings.npy (for future runs)")