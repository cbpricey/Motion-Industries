# Frequently Asked Questions (FAQ)

---

### **1. Why are there two different ElasticSearch clients, one in the scraper and one in the UI?**

The scraper and the UI each interact with ElasticSearch, but they serve different roles:

- **Scraper ES Client (Python):**  
  - Inserts new documents into the `image_metadata` index  
  - Writes confidence scores, descriptions, and image URLs  
  - Creates the index if it doesn't already exist  
  - Used during offline batch processing  

- **UI ES Client (Node.js):**  
  - Reads documents already indexed by the scraper  
  - Applies filters (manufacturer, SKU prefix, confidence ranges)  
  - Updates review status fields (pending-approve, pending-reject, approved, rejected)  
  - Never downloads or processes images  

Because these operate in different languages (Python vs. Node) and have different responsibilities (write-heavy vs. read/update-heavy), **each uses its own official Elastic client library**.

---

### **2. What does the Prisma Adapter do in NextAuth, and why do we need it?**

NextAuth uses **adapters** to store user account and session data in a database.  
The **Prisma Adapter** tells NextAuth to store this data using Prisma models instead of an in-memory store or JSON files.

The adapter handles:

- Creating users  
- Linking OAuth accounts (if used)  
- Storing hashed passwords (if using credentials provider)  
- Saving and restoring user sessions  
- Managing verification tokens (if email login is used)  
- Mapping NextAuth’s schema onto `schema.prisma`

Without the Prisma Adapter:

- User accounts would **not persist**  
- Sessions would disappear after server restarts  
- Admin/reviewer roles could not be stored  

The Prisma Adapter ensures authentication integrates cleanly with Postgres/SQLite.

---

### **3. What is the difference between `prisma generate` and `prisma migrate dev`?**

These commands serve totally different purposes:

#### **`npx prisma generate`**
- Regenerates the Prisma Client (`@prisma/client`)
- Required whenever the schema changes, even without a DB migration
- Does **NOT** modify your database
- Used by the UI to access the database with updated TypeScript types

You run it after:
- Pulling from Git
- Updating `schema.prisma`
- Installing dependencies on a new machine

#### **`npx prisma migrate dev`**
- Applies schema changes *to the actual database*
- Creates a new migration folder under `/prisma/migrations`
- Updates the database to match the schema
- Only used in development (not production)

You run it after:
- Adding/removing fields in the Prisma schema  
- Creating new tables  
- Changing data types  

If you skip migrations, the database schema and Prisma Client will become inconsistent.