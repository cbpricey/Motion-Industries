# Features & How to Use Them

This section describes each major feature implemented in the Motion Industries Image-to-Product Matching System.  
It includes how the feature works, how to use it, and how it connects to other parts of the system.

---

# 1. Login & User Authentication (NextAuth)

The system includes full authentication using **NextAuth v4 with Prisma Adapter**.

## How to Use
1. Navigate to `http://localhost:3000/`.
2. Log in with Google OAuth.
3. Users are automatically assigned the role **REVIEWER**
4. You can manually edit a user's role through prisma studio for local development or through Neon (To seed an admin)

## How It Works
- Authentication state is stored in the database defined by `DATABASE_URL`.
- When the UI starts, NextAuth loads sessions and enforces access control.
- Routes requiring authentication automatically redirect unauthenticated users.

## Connections to Other Features
- User role determines access:
  - Reviewers can only mark items as pending-approve/reject.
  - Admins finalize review decisions and see additional pages.

---

# 2. SKU Workbench (Image Review Interface)

This is the main review tool to validate image-to-product matches.

## What It Does
- Loads product documents from ElasticSearch.
- Displays metadata such as:
  - Manufacturer
  - SKU Number
  - Confidence Score
  - Product Image
- Allows reviewers/admins to approve, reject, or flag items.
- Provides pagination and filtering options.

## How to Use
1. Using the navbar, navigate to **Catalog Navigator**
2. Optionally apply filters:
```
   - Manufacturer
   - SKU prefix
   - Minimum confidence score
```
3. Review each presented product:
```
   - **Approve** → Reviewer marks as `pending-approve`; admin finalizes to `approved`.
   - **Reject** → Reviewer marks as `pending-reject`; admin finalizes to `rejected`.
```

## Connections to Other Features
- Output connects to **Review History**, where all decisions are displayed.
- Uses ElasticSearch as its data source.
- Uses user role from NextAuth to determine what actions are allowed.

---

# 3. Review History

The Review History page shows all items that reviewers or admins have acted on.

## What It Does
- Displays previous reviews grouped by:
  - `pending-approve`
  - `pending-reject`
  - `accepted`
  - `rejected`
- Allows filtering by status.
- Shows metadata such as title, manufacturer, and confidence score.

## How to Use
1. Navigate to **Review History**.
2. Choose a filter:
   - All
   - Pending Approve
   - Accepted
   - Pending Reject
   - Rejected

## Connections to Other Features
- All review actions performed in **SKU Workbench** appear in Review History.
- All review actions are stored in separate ElasticSearch indices by UID
- Helps track workflow and ensure the image pipeline achieves high precision.

---

# 4. Catalog Navigator (Product Search)

This feature allows users to search the catalog by basic metadata.

## What It Does
- Filters products by manufacturer, SKU number, or SKU prefix.
- Queries ElasticSearch with specified parameters.
- Displays results in grid layouts.

## Connections to Other Features
- Shares the same ElasticSearch index as the SKU Workbench.
- Helps reviewers quickly locate related items during validation.
- Also used by admins for auditing or verifying scraper output.

---

# 5. User Index

The **User Index** is an admin-only page that allows administrators to view all registered users.

## What It Does
- Displays all users & their info stored in the auth database.
- Gives admins CRUD access to user info.

## Connections to Other Features
- Completes the reviewer → admin approval pipeline.
- Ensures that only admins make final decisions.
- Helps maintain quality in the image-matching process.

---

# 6. Python Scraper Integration

The scraper is a separate Python application used to batch-process SKU data from Excel files and gather product images.

## What It Does
- Reads SKU and manufacturer information from Excel files.
- Searches manufacturer websites, enterprise sites, distributors, and general search engines for product images.
- Downloads and filters images (size, quality, duplicates).
- Saves cleaned images to a destination directory.
- Generates metadata sidecar JSON files.
- Computes a confidence score using the ML model.
- Indexes image + product metadata into ElasticSearch so the UI can display it.

## How to Use
1. Ensure ElasticSearch is running (`docker compose up` from `MotionUI/motion-ui`).
2. From `MotionAppFiles` install dependencies:

```
pip install -r requirements.txt
```

3. Run the scraper GUI:

```
python image_scraper.py
```

4. Select:
   - Input Excel file  
   - Context Excel file  
   - Output directory  
   - (Optional) entry range  

5. Click **Run** to begin scraping.

## Connections to Other Features
- Populates the ElasticSearch index used by Catalog Navigator and SKU Workbench.
- Provides the raw images and metadata that reviewers and admins validate.
- Supplies confidence scores that appear in the UI.
- Acts as the first step of the full pipeline (scraper → ML scoring → UI review).


# 7. Confidence Scoring System

Images downloaded by the scraper are assigned confidence scores reflecting the probability the image is actually a product image.

## Implementation Details
- Uses XGBoost, a gradient boosting decision tree machine learning library. 
- Our XGBoost classifier was trained on a dataset including good images provided by Motion and bad images from the scraper
- The trained model takes image and filename features (detailed below), then assigns a confidence score between 0 and 1

# Features used by Model
- MFRSimilarity: fuzzy similarity between SKU manufacturer and candidate image file name
- Entropy: Shannon entropy of the image, a measure of pixel randomness/complexity
- Sharpness: detects edges or bluriness in image using the Laplacian method
- Brightness: mean of all pixel values in grayscaled image (higher mean = brighter image)
- WhiteRatio: portion of image that is white pixels (product images tend to have white backgrounds)
- WhiteBorderRatio: portion of visible pixels in a thin border ring around the image that are white

## Connections to Other Features
- Confidence scores are saved to ElasticSearch along with images
- Displayed as % between 0-100 in Review UI, where reviewers can sort or filter by confidence
  - This enables priotization of images most likely to be relevant
- Final approvals and rejections are logged, this feedback is used to continually retrain model

---

# 8. Reviewer -> Admin Pipeline

The system enforces a controlled approval process.

## Workflow States
- `pending-approve` — reviewer recommended approval  
- `pending-reject` — reviewer recommended rejection  
- `approved` — admin-approved  
- `rejected` — admin-rejected  

## How to Use
- Reviewers choose "Approve" → sets status to pending-approve  
- Admins finalize → sets to approved or rejected  

## Connections to Other Features
- Review History displays state transitions.
- Helps maintain accuracy and accountability.

---

# 9. ElasticSearch Index Design

Your team stores product metadata in a search-optimized index.

## What It Does
- Stores:
  - SKU number
  - Manufacturer
  - Image URL
  - Title
  - Description
  - Confidence score
  - Status

## Connections to Other Features
- All UI search features depend on this index.
- Scraper generates data for the index.
- ML model may overwrite or enhance scores.