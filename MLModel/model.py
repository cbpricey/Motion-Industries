import xgboost as xgb
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix

# Load data
df = pd.read_csv("Output/images_with_features_new.csv")
# df = df.tail(568).reset_index(drop=True)
# print(len(df))

# Features and labels
X = df.drop(columns=["[<ID>]", "ITEM_NO", "ENTERPRISE_NAME", "MFR_NAME", "PRIMARY_IMAGE", "Label", "Resolution"])
y = df["Label"]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2
)


ratio = (len(y_train) - sum(y_train)) / sum(y_train)
model = xgb.XGBClassifier(
    objective="binary:logistic",
    eval_metric="logloss",
    use_label_encoder=False,
    # scale_pos_weight=ratio,  # tells XGBoost to pay more attention to the minority (bad) class
)
model.fit(X_train, y_train)

# Save trained model in same directory as scraper
joblib.dump(model, "../MotionAppFiles/image_classifier_confidence.pkl")

# Evaluate
y_pred_proba = model.predict_proba(X_test)[:, 1]
y_pred = (y_pred_proba > 0.2).astype(int)

print("AUC:", roc_auc_score(y_test, y_pred_proba))
print(confusion_matrix(y_test, y_pred))
print(classification_report(y_test, y_pred, target_names=["Rejected", "Approved"]))

# Assuming your model is called `model` and features are in `X`
importances = model.feature_importances_
feature_importance_df = pd.DataFrame({
    'Feature': X.columns,
    'Importance': importances
}).sort_values(by='Importance', ascending=False)

# Print top features
print(feature_importance_df.head(20))

results = pd.DataFrame({
    "Actual": y_test.values,
    "Predicted": y_pred,
    "Confidence (%)": (y_pred_proba * 100).round(2)
})

# Optionally add row indices or image identifiers if you have them
# results["Image_ID"] = X_test.index  # or df.loc[X_test.index, "PRIMARY_IMAGE"]

# Sort by confidence if you want to see most/least certain predictions
results_sorted = results.sort_values(by="Confidence (%)", ascending=False)

# Show a few examples
print(results_sorted.head(10))
