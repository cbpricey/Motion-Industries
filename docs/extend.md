# How to Modify & Extend the Software

This section explains how a developer can modify or extend the Motion Industries Image-to-Product Matching System after installing it.  
It covers the project structure, languages, build tools, dependency management, and guidelines for contributing changes.

---

# 1. Technologies Used

## Backend & Data
- **ElasticSearch** (image metadata + search)
- **Postgres or SQLite** (user accounts, sessions)
- **Python 3** (scraper + ML model)

## Frontend / UI
- **Next.js 15 (React)**
- **TypeScript**
- **TailwindCSS**
- **NextAuth (Authentication)**

## Build / Dev Tools
- **npm** (package management)
- **Prisma** (database ORM)
- **Docker Compose** (ElasticSearch + Kibana)

---

# 2. Project Structure Overview

```
Motion-Industries/
│
├── MotionUI/
│   └── motion-ui/       ← Next.js front-end
│
├── MotionAppFiles/      ← Python scraper
│
└── ML-Model/            ← Machine learning model (confidence scoring)
```

Each component is independent but integrated through a shared ElasticSearch cluster.

---

# 3. Modifying the UI (Next.js)

All UI-related code lives in:

```
MotionUI/motion-ui/src/
```

### Key locations:
- `src/app/` → Route handlers and page components  
- `src/app/api/` → API routes for fetching/indexing data  
- `src/components/` → Shared UI components  
- `prisma/schema.prisma` → Database schema  

### How to Extend the UI
- Add new pages under `src/app/<route>/page.tsx`
- Add new API routes under `src/app/api/<name>/route.ts`
- Add new database models or fields in `schema.prisma` and run:

```
npx prisma migrate dev
```

### Rebuilding
Run the dev server:

```
npm run dev
```

---

# 4. Modifying the Database (Prisma)

The database schema is defined in:

```
MotionUI/motion-ui/prisma/schema.prisma
```

To add columns, tables, or relations:

1. Edit `schema.prisma`
2. Run:
   ```
   npx prisma migrate dev
   ```
3. Update any API routes or UI components that depend on the changed data

Prisma automatically generates `.ts` client types based on the updated schema.

---

# 5. Modifying the Scraper (Python)

Scraper code lives in:

```
MotionAppFiles/
```

Dependencies are in:

```
requirements.txt
```

### How to Extend the Scraper
- Modify search logic in `fetch_image_urls`
- Adjust filtering rules (image size, origin, etc.)
- Extend the GUI (Tkinter) in the `__main__` block
- Add new metadata fields to ElasticSearch by modifying:
  - `index_image_metadata()`
  - Sidecar JSON generation via `json_sidecar`

If ElasticSearch mappings change, update the UI to read new fields.

Run scraper locally:

```
python image_scraper.py
```

---

# 6. Modifying the ML Model

The ML folder contains the confidence-scoring model (`.pkl` file) and feature extraction code.

### How to Extend
- Re-train the model with new features or datasets  
- Update feature extraction functions in the scraper  
- Replace the `.pkl` file with a new version  
- Adjust UI display if confidence score meaning changes  

The scraper automatically loads the model:

```
model = joblib.load(MODEL_PATH)
```

---

# 7. Dependencies & Build Management

## Node / UI Dependencies
Stored in:

```
MotionUI/motion-ui/package.json
```

Install new packages:

```
npm install <package>
```

## Python Dependencies
Stored in:

```
MotionAppFiles/requirements.txt
```

Install updated requirements:

```
pip install -r requirements.txt
```

## Docker Services
ElasticSearch + Kibana:

```
cd MotionUI/motion-ui
docker compose up
```

---

# 8. Coding Style & Contribution Guidelines

## UI (TypeScript/React)
- Use functional components + hooks  
- Keep components in `src/components/`  
- Prefer async/await with proper error handling  
- Follow the folder structure already established  

## Backend (API routes)
- Return structured JSON  
- Validate input using Zod  
- Use Prisma for all DB writes  

## Python (Scraper)
- Keep functions small and modular  
- Use logging instead of print statements  
- Use clear directory structure for output files  
- Avoid hard-coding environment values  

---

# 9. Major Architectural Notes

- ElasticSearch is the **central data source** for product and image metadata  
- UI depends on ES being reachable before any page will load data  
- The scraper pushes documents into the same index the UI consumes  
- Postgres (or SQLite) only stores **authentication and user accounts**, not product data  
- The ML model enhances the image ranking pipeline but is optional for the UI  

---

# Summary

To extend this project, a developer may modify:
```
- UI pages in Next.js
- API routes
- Prisma database schema
- Scraper logic or metadata indexing
- ML confidence scoring
- Docker/ElasticSearch configuration
```