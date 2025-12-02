# Motion Industries – Installation & Environment Setup

This page describes how to install and run all components of the Motion Industries Image-to-Product Matching System.
By the end of this guide you will be able to:

* Run the Python scraper

* Run the Next.js Review UI

* Connect to Postgres (production) or SQLite (local development)

* Start ElasticSearch + Kibana

* Configure all environment variables

* Understand required software and folders

## 1. Repository Structure
```
Motion-Industries/
│
├── ML-Model/                     ← Machine learning ranking model
│
├── MotionAppFiles/               ← Python scraper
│   ├── requirements.txt
│   └── scraper scripts...
│
└── MotionUI/
    └── motion-ui/                ← Next.js UI
        ├── package.json
        ├── docker-compose.yml    ← ElasticSearch + Kibana (local)
        └── src/...
```

## 2. Required Software

Install the following:

### Python 3.10+

Used by the scraper and ML model.

### Node.js 18+

Required to run the Next.js UI.

### npm

Comes with Node. Used to install UI dependencies.

### Git

Required to clone and manage the project.

### Docker Desktop

Used to run ElasticSearch + Kibana locally via docker-compose.

### Prisma CLI

Installed automatically when you run:

```
npm install
```

## 3. ElasticSearch Setup (Local OR Cloud)

You can connect to an ElasticSearch cluster in two different ways.

### Local ElasticSearch (Development)

From `MotionUI/motion-ui`:
```
docker compose up
```

This will launch ElasticSearch on `http://localhost:9200`

### ElasticSearch Cloud (Production)
You may need to connect to a hosted Elastic cluster for production.
Our sponsor created one for us and provided us with the credentials, which you will need to add to your .env file (see below):

```
ELASTICSEARCH_URL=
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

## 4. User Info Database (Postgres OR SQLite)

Local SQLite — used in development

Hosted Postgres (NeonDB) — used in production

### SQLite (Local Development)

1. Set your DATABASE_URL to:

`DATABASE_URL="file:./dev.db"`

2. Change datasource block in `prisma/schema.prisma` to:
```
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

3. Run migrations:

`npx prisma migrate dev`

Prisma will create dev.db automatically.

### Connect to Postgres (NeonDB)

You can create a NeonDB instance for auth
And set your environment variable to:

`DATABASE_URL="YOUR_CONNECTION_STRING"`

## 5. NextAuth

The application uses **NextAuth v4** for user authentication, with three supported login methods:

- GitHub OAuth  
- Google OAuth  
- Email + Password (Credentials Provider)

NextAuth uses the **Prisma Adapter** to store users, sessions, and roles in the database defined by `DATABASE_URL`.  
This means both Postgres (production) and SQLite (local development) fully support authentication.

### How It Works
- Users authenticate using one of the enabled providers.
- NextAuth stores user/session data through Prisma.
- Session callbacks attach the user’s `id` and `role` (`admin` or `reviewer`) to every request.
- The UI uses this role to determine page access.

### What Future Teams Should Know
- Adding new OAuth providers requires adding their client ID/secret to `.env`.
- Changing user roles requires updating the NextAuth callbacks.
- The Prisma schema controls how users/sessions are stored—changes here affect NextAuth.


## 6. Environment Variables

Inside MotionUI/motion-ui/, create a .env file:
```
DATABASE_URL="postgres OR sqlite connection string here"

ELASTICSEARCH_URL="http://localhost:9200"
ELASTICSEARCH_USERNAME=""     # leave empty for local
ELASTICSEARCH_PASSWORD=""     # leave empty for local

NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"

# Register for an OAuth client and place the client credentials inside your environment
GITHUB_ID=
GITHUB_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

To generate a secure secret:

`openssl rand -base64 32`

## 7. Install UI Dependencies (Next.js App)

From `MotionUI/motion-ui`:

Install packages:

`npm install`

Run Prisma client generation:

`npx prisma generate`

## 8. Start the UI

Development mode:

`npm run dev`

This will run the app locally hosted at

`http://localhost:3000/`

## 9. Running the Scraper

From `MotionAppFiles`:

`pip install -r requirements.txt`

Run the scraper:

`python image_scraper.py`

Notes:

* The scraper uses the Python elasticsearch client

* It also assumes ElasticSearch is running.  So you must docker compose up from `MotionUI/motion-ui` first for local development, in order for JSON data to be indexed into it.

* There is an initialization of the es client for local development commented out in `image_scraper.py`, you can simply uncomment this block and comment the other one.