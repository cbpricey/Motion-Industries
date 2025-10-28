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
GITHUB_ID=Ov23lip8cTsGe8Roy5ke
GITHUB_SECRET=c085f527b8648c83a92f713273d423fe3b24b6dc

# Google OAuth Client
GOOGLE_CLIENT_ID=1072253817961-po1sijms5ijbk41ukeglup26ckh5tt22.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# NextAuth Secret
NEXTAUTH_SECRET=fr4Rh7wIyK4uD5dvsuuYgC5ZnhcjMb5zVZAnPGpWTjg

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