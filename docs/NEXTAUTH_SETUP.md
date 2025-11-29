# 🔐 NextAuth Setup Guide

This document explains how to set up and use **NextAuth.js** for authentication in the Motion Industries Capstone project.  
It covers installing dependencies, seeding an admin user, configuring environment variables, and running the app locally.

---

## 1️⃣ Install Dependencies

From the project root (`Motion-Industries/MotionUI/motion-ui`):

`bash`
npm install next-auth

## 2️⃣ Configure Environment Variables
Create a new file named `.env.local` in `motion-ui/` (same directory as `package.json`).

Copy these variables into `.env.local`:

```bash
# GitHub OAuth app
GITHUB_ID=...
GITHUB_SECRET=...

# Google OAuth Client
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# NextAuth Secret
NEXTAUTH_SECRET=...

# Local App
NEXTAUTH_URL=http://localhost:3000
```


*Next.js automatically excludes .env\* in .gitignore*

## 3️⃣ Seed the Admin User
Before starting the app, seed an admin account for yourself.
1. Make sure Docker (Elasticsearch) is running.
2. Edit the `scripts/seed-admin.mjs` file:
    const res = await client.index({
    index: "users",
    document: {
        email: "your.email@example.com",
        name: "Your Name",
        role: "admin",
        created_at: new Date().toISOString(),
    },
    });
3. Run the seeder script:
*npm run seed:admin*
This will create your admin user in the `users` index of Elasticsearch. (Will also create the `users` index if it doesn't already exist)

## 4️⃣ Run the Development Server
*npm run dev* 
Then open http://localhost:3000

The **Sign In** button will appear in the navbar.
Click it to choose **GitHub** or **Google** and sign in.
* The seeded admin account will log in as **admin**
* New OAuth sign-ins will be automatically added to the `users` index as **reviewer**