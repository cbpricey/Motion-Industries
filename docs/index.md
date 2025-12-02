# Motion Industries Image-to-Product Matching System  
### Documentation Homepage

Welcome to the documentation site for the Motion Industries Capstone Project.  
This project implements an automated system for discovering, ranking, and validating product images for Motion’s 2M+ item catalog. The system combines Python-based scraping, machine learning–driven confidence scoring, ElasticSearch indexing, and a full-stack review UI to streamline Motion’s internal content workflows.

---

# Project Overview

This system automates the process of finding and validating product images by:

1. **Scraping** manufacturer and distributor websites for product images  
2. **Ranking** images using a machine-learning model  
3. **Indexing** all results into an ElasticSearch cluster  
4. **Allowing human reviewers** to approve or reject images through a dedicated UI  
5. **Finalizing decisions** via an admin-only workflow  
6. **Storing user accounts and permissions** with NextAuth and Postgres/SQLite  

It is designed to scale, improve precision, and reduce the time spent manually sourcing product images.  
This meets key project requirements such as automated discovery, ML scoring, review/validation UI, scalable indexing, and documentation. 

---

# Features Covered in This Documentation

- How to **install** and run each component  
- How the **UI features** work (Login, SKU Workbench, Catalog Navigator, Review History)  
- How the **admin workflow** operates  
- How the **Python scraper** integrates with ElasticSearch  
- How to **extend or modify** the system  
- Frequently asked questions and troubleshooting  

Use the navigation sidebar to explore each section.

---

# System Architecture (High-Level)

```
 Excel Files ──► Python Scraper ──► ML Scoring ──► ElasticSearch Index
                                                        │
                                                        ▼
                                                Next.js Review UI
                                            (Reviewer & Admin workflow)
                                                        
```

**Core components:**<br>
- **Python Scraper** – gathers candidate images and metadata  
- **ML Model** – assigns confidence scores  
- **ElasticSearch** – stores searchable product records  
- **Next.js UI** – human review interface  
- **NextAuth + Postgres/SQLite** – user authentication and roles  

---

# Roles in the System

### **Reviewer**
- Views images from the scraper  
- Marks them as *pending-approve* or *pending-reject*  

### **Admin**
- Finalizes decisions (approved/rejected)  
- Views the User Index  
- Has full access to workflow pipelines  

---

# Documentation Sections

- **Installation** – How to set up the scraper, UI, databases, and search cluster  
- **Features** – How each UI page and ML/scraper feature works  
- **Modify & Extend** – How to build on or contribute to the codebase  
- **Demo Video** – Screencast of the system running  
- **FAQ** – Common issues and fixes  

Use the sidebar to access each section.

---

# Project Goal

The system must:  
- Automatically discover and match product images using available data  
- Score image relevance using ML-based confidence ranking  
- Provide a user-friendly interface for verifying and approving images  
- Support scaling to millions of products  
- Achieve high precision (>90%) on reviewed samples  
- Offer documentation for future teams and Motion developers  

---

# Summary

This documentation accompanies the full Motion Industries Image-to-Product Matching pipeline.  
It is intended for:

- Developers extending the project  
- Reviewers and admins using the UI  
- Future teams inheriting the codebase  
- Technical evaluators assessing system functionality  

Use the navigation menu to begin with **Installation**, then explore each major system feature.

