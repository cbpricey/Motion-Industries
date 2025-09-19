import xgboost as xgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

# Load data
df = pd.read_csv("training_data.csv")

# Features and labels
X = df.drop(columns=["SKU", "Filename", "Label"])
y = df["Label"]

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train
model = xgb.XGBClassifier(
    objective="binary:logistic",
    eval_metric="logloss",
    use_label_encoder=False
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict_proba(X_test)[:, 1]
print("AUC:", roc_auc_score(y_test, y_pred))
