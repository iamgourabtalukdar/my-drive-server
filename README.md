# ☁️ MyDrive - Cloud Storage Solution

A production-minded, full‑stack cloud storage app (MERN) with secure direct-to-S3 uploads, CloudFront-backed file delivery, session cookie auth, and a freemium storage model.

---

## 🤔 Why I Built This

I built MyDrive to practice and demonstrate engineering patterns that matter in real SaaS products: secure direct uploads, CDN-backed delivery, infrastructure-grade deployment, and a pay-to-upgrade storage model. This project is meant to show how to design a client‑friendly UX while keeping the server authoritative for security, billing, and access control.

Key engineering goals:

- Secure client uploads without proxying large payloads through the app server (signed S3 URLs).
- Fast global file access through CloudFront with controlled access (signed CloudFront URLs).
- Simple, durable persistence in MongoDB Atlas and a production-ready deployment on EC2 (nginx + PM2).
- Real product flows: signup/login (Google + email), free 1GB forever, paid upgrades to extend storage.

---

## ✨ Features

### 🔐 Authentication & User Management

- Email & password signup / login
- OAuth login via Google
- Session cookie-based authentication with secure, HTTP-only cookies
- Account page with profile, storage usage, and plan details

### 📁 File Storage & Delivery (What it does)

- Secure direct-to-S3 uploads via backend-generated pre-signed PUT URLs
- Files served to clients through CloudFront using signed CloudFront URLs (backend generates signed access URLs)
- File metadata stored in MongoDB Atlas (owner, size, content-type, createdAt, storageClass, access control)
- File operations: upload, rename, delete (soft delete + permanent purge), download, and share links

### 💸 Billing & Quota Model

- Free tier: 1 GB storage always included
- Paid plans unlock higher storage quotas and larger per-file limits
- Payment order flow (webhook-enabled) to verify payments and update user quotas
- Pluggable payment gateway (Stripe / Razorpay)

### 🔗 Sharing & Permissions

- Share files via email or public links
- Role-based access control (**Viewer / Editor**)
- Manage **Shared by Me** and **Shared with Me** files
- Real-time updates and activity tracking

### ⚙️ Settings & Customization

- Update profile, password, and manage sessions
- View used and available storage
- Logout, disable, or delete account

### ⚙️ Infrastructure & Deployment (How it's run)

- Backend hosted on AWS EC2 behind nginx and managed with PM2
- MongoDB Atlas as the primary database
- AWS S3 for object storage; CloudFront for CDN (signed URL access)
- Optional Redis session store for scaling and session invalidation

### 🛡️ Security & Reliability

- Server-side validation of uploads, signed URL expiry, and download authorization
- S3 bucket policies, CloudFront signing, CORS and rate-limiting to reduce abuse
- HTTPS (TLS) enforced at nginx / CloudFront
- Considerations for multi-region, backups, and monitoring

---

## 🧩 Tech Stack

| Category      | Technologies                         |
| ------------- | ------------------------------------ |
| Frontend      | React, Vite, TailwindCSS             |
| Backend       | Node.js, Express.js                  |
| Database      | MongoDB Atlas                        |
| Cloud Storage | AWS S3                               |
| CDN           | AWS CloudFront (signed URLs)         |
| Deployment    | AWS EC2, nginx, PM2                  |
| Auth          | OAuth (Google), Email/Password       |
| Payment       | Payment Gateway - Razorpay (webhook) |

---

## 🚀 Quickstart ��� Run Locally

Prerequisites:

- Node.js (20+),
- npm
- AWS user with S3 permissions (for testing signed URLs you can use a dev bucket)
- MongoDB Atlas connection string
- OAuth credentials for Google (for local testing you can use localhost redirect URIs)
- Payment gateway test keys

1. Clone the repos
   - Frontend: https://github.com/iamgourabtalukdar/my-drive-client
   - Backend: https://github.com/iamgourabtalukdar/my-drive-server

2. Backend (server)
   - cd my-drive-server
   - create .env and set environment variables
   - npm install
   - npm run dev
   - Server defaults to http://localhost:4000

3. Frontend (client)
   - cd my-drive-client
   - create .env and set environment variables
   - npm install
   - npm run dev
   - Open http://localhost:5173

4. Typical developer flow
   - Create an account (or login with Google)
   - Upload a small file: client requests a pre-signed PUT URL from backend, uploads directly to S3, then notifies backend to persist metadata.
   - Download/view a file: frontend requests a CloudFront signed URL from backend and uses it to fetch the object securely.

---

## 🔌 Signed URL Flow (high level)

- Upload:
  1. Client -> Backend: request pre-signed upload URL (file metadata)
  2. Backend: generate S3 pre-signed PUT URL (short expiry) and return to client
  3. Client: PUT file directly to S3 using pre-signed URL
  4. Client -> Backend: notify upload complete; backend records metadata in MongoDB
- Download:
  1. Client -> Backend: request download URL for a file
  2. Backend: verify permissions, generate CloudFront signed URL, return to client
  3. Client: fetch file via CloudFront (fast, cached, and signed)

This keeps large payloads off the app server and ensures controlled, auditable access.

---

## 🔒 Security & Production Considerations

- Use HTTP-only, Secure cookies with SameSite attributes for session cookies.
- Store session data in Redis (or DB) for safe invalidation and multi-instance scaling.
- Use short expirations for pre-signed S3 URLs and CloudFront signed URLs.
- Implement server-side file type/size checks and virus scanning hooks for uploaded content.
- Enforce strong S3 bucket policy, least privilege IAM roles, and CloudFront origin restrictions.
- Keep secrets in a secure secret manager (AWS Secrets Manager, Parameter Store) and rotate keys.
- Monitor upload patterns and rate-limit endpoints to mitigate abuse and DDoS attempts.

---

## 🧭 Roadmap & Next Steps

- Encrypted at-rest user-side encryption (private keys on client)
- Per-file sharing permissions with expiration and revocation
- Background virus scanning and content moderation
- Organization & team plans with shared storage and admin controls
- Native mobile apps and background sync
- Advanced billing (coupons, usage-based billing, enterprise invoicing)

---

## 📎 Project Links

- Live demo: https://storage-app.gourab.tech
- Frontend repo: https://github.com/iamgourabtalukdar/my-drive-client
- Backend repo: https://github.com/iamgourabtalukdar/my-drive-server

---

## ✍️ Contribution & Contact

This project is meant to illustrate production-minded full-stack engineering with cloud storage primitives. If you’re a recruiter or engineering manager and would like a short walkthrough or demo, feel free to reach out via my GitHub profile: iamgourabtalukdar.

---

## 📜 License

MIT — feel free to reuse, adapt, or extend for demos and interview projects.
