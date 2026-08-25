# PRD — Auth API Backend (Multi-App)

## 1. Overview

API Backend autentikasi untuk melayani multiple aplikasi Flutter. Menggunakan sistem **JWT dual-token** (Access Token & Refresh Token) dengan isolasi session per-aplikasi.

**Tech Stack:**
- Runtime: Node.js + TypeScript
- Framework: Express.js
- ORM: Prisma
- Database: PostgreSQL
- Validation: Zod
- Hashing: bcrypt

---

## 2. Konsep Multi-App & Isolasi

Setiap aplikasi Flutter yang terhubung ke auth API ini harus terdaftar sebagai `app` di database. Sistem ini memungkinkan:

- **1 akun user bisa login di semua app** (shared identity)
- **Session/token terisolasi per-app** (logout app A tidak ganggu app B)
- **Validasi app identity** di setiap request auth

### 2.1. App Identification

Setiap request ke endpoint auth wajib menyertakan header:

```
X-App-Id: fitness_journal
X-App-Secret: fj_secret_xxx
```

Middleware `verifyApp` memvalidasi bahwa app terdaftar dan secret cocok sebelum request diteruskan ke controller.

### 2.2. Dampak Isolasi

| Skenario | Hasil |
|----------|-------|
| User login di App A | Dapat token khusus App A |
| User login di App B | Dapat token terpisah, session berbeda |
| Logout dari App A | Hanya revoke token App A |
| Logout All | Revoke semua token di semua app |
| Refresh token App A dipakai di App B | Ditolak — `app_id` tidak cocok |

---

## 3. Global Response Format (Envelope)

**Sukses (HTTP 2xx):**
```json
{
  "status": "success",
  "message": "Deskripsi singkat",
  "data": { ... }
}
```

**Gagal Validasi (HTTP 4xx):**
```json
{
  "status": "fail",
  "message": "Validation error",
  "data": { "email": "Email wajib diisi" }
}
```

**Gagal Umum (HTTP 4xx):**
```json
{
  "status": "error",
  "message": "Alasan kegagalan",
  "data": null
}
```

---

## 4. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model App {
  id         String   @id @default(uuid())
  appName    String   @unique @map("app_name")
  appSecret  String   @map("app_secret") // hashed
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")

  tokens UserToken[]

  @@map("apps")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tokens UserToken[]

  @@map("users")
}

model UserToken {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  appId        String    @map("app_id")
  refreshToken String    @map("refresh_token") // hashed
  expiresAt    DateTime  @map("expires_at")
  revokedAt    DateTime? @map("revoked_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
  app  App  @relation(fields: [appId], references: [id])

  @@index([refreshToken])
  @@index([userId, appId])
  @@map("user_tokens")
}
```

---

## 5. Alur Autentikasi Per-Aplikasi

### 5.1. Registrasi App (Developer, Satu Kali)

Setiap app Flutter didaftarkan ke table `apps` via seed script atau endpoint admin:

```
fitness_journal  → app_secret: hashed("fj_secret_xxx")
warranty_tracker → app_secret: hashed("wt_secret_xxx")
sub_manager      → app_secret: hashed("sm_secret_xxx")
english_conv     → app_secret: hashed("ec_secret_xxx")
```

### 5.2. Konfigurasi di Flutter (Per-App)

```dart
// lib/config/auth_config.dart
class AuthConfig {
  static const appId = 'fitness_journal';
  static const appSecret = 'fj_secret_xxx';
  static const baseUrl = 'https://api.domain.com';
}

// Di HTTP interceptor (Dio)
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    options.headers['X-App-Id'] = AuthConfig.appId;
    options.headers['X-App-Secret'] = AuthConfig.appSecret;
    return handler.next(options);
  },
));
```

### 5.3. Flow Register

```
POST /api/auth/register
Headers: X-App-Id, X-App-Secret
Body: { "email": "andi@mail.com", "password": "xxx", "name": "Andi" }

→ Middleware verifyApp: validasi app_id + secret
→ Controller: buat user di table users (global)
→ Generate access_token (berisi user_id + app_id)
→ Generate refresh_token (simpan di user_tokens dengan app_id)
→ Response: { access_token, refresh_token }
```

### 5.4. Flow Login

```
POST /api/auth/login
Headers: X-App-Id, X-App-Secret
Body: { "email": "andi@mail.com", "password": "xxx" }

→ Middleware verifyApp
→ Cari user by email
→ Verifikasi password (bcrypt compare)
→ Generate access_token: { user_id, app_id, exp: 15min }
→ Generate refresh_token: simpan ke user_tokens dengan relasi app_id
→ Response: { access_token, refresh_token }
```

### 5.5. Flow Refresh Token

```
POST /api/auth/refresh
Headers: X-App-Id, X-App-Secret
Body: { "refresh_token": "xxx" }

→ Middleware verifyApp
→ Cari token di user_tokens WHERE refresh_token = hash(xxx) AND app_id = header.app_id
→ Jika tidak ditemukan atau app_id tidak cocok → 401
→ Jika expired atau revoked → 401
→ Revoke token lama (set revoked_at)
→ Generate pasangan token baru
→ Response: { access_token, refresh_token }
```

### 5.6. Flow Logout (Per-App)

```
POST /api/auth/logout
Headers: Authorization: Bearer <access_token>, X-App-Id, X-App-Secret
Body: { "refresh_token": "xxx" }

→ Middleware verifyApp + authMiddleware
→ Revoke refresh_token WHERE user_id AND app_id
→ Response: { status: "success", data: null }
```

### 5.7. Flow Logout All Apps

```
POST /api/auth/logout-all
Headers: Authorization: Bearer <access_token>, X-App-Id, X-App-Secret

→ Middleware verifyApp + authMiddleware
→ Revoke ALL refresh_tokens WHERE user_id (semua app)
→ Response: { status: "success", data: null }
```

---

## 6. Endpoints Summary

| Method | Path | Middleware | Deskripsi |
|--------|------|-----------|-----------|
| POST | `/api/auth/register` | verifyApp | Daftar akun baru |
| POST | `/api/auth/login` | verifyApp | Login, dapat token pair |
| POST | `/api/auth/refresh` | verifyApp | Tukar refresh token → token pair baru |
| POST | `/api/auth/logout` | verifyApp, auth | Revoke token app ini |
| POST | `/api/auth/logout-all` | verifyApp, auth | Revoke semua token semua app |

---

## 7. JWT Specification

**Access Token Payload:**
```json
{
  "user_id": "uuid-123",
  "app_id": "fitness_journal",
  "email": "andi@mail.com",
  "iat": 1691234000,
  "exp": 1691234900
}
```

| Parameter | Nilai |
|-----------|-------|
| Algorithm | HS256 |
| Access Token TTL | 15 menit |
| Refresh Token TTL | 30 hari |
| Secret | `JWT_SECRET` dari env |

---

## 8. Middleware

### 8.1. verifyApp (Semua endpoint auth)

```typescript
async function verifyApp(req: Request, res: Response, next: NextFunction) {
  const appId = req.headers['x-app-id'] as string;
  const appSecret = req.headers['x-app-secret'] as string;

  if (!appId || !appSecret) {
    return res.status(401).json({
      status: 'error',
      message: 'App credentials required',
      data: null,
    });
  }

  const app = await prisma.app.findUnique({ where: { appName: appId } });
  if (!app || !app.isActive) {
    return res.status(401).json({
      status: 'error',
      message: 'App not registered',
      data: null,
    });
  }

  const valid = await bcrypt.compare(appSecret, app.appSecret);
  if (!valid) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid app secret',
      data: null,
    });
  }

  req.appId = app.id;
  req.appName = app.appName;
  next();
}
```

### 8.2. authMiddleware (Endpoint yang butuh login)

```typescript
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Token required',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    if (payload.app_id !== req.appName) {
      return res.status(401).json({
        status: 'error',
        message: 'Token app mismatch',
        data: null,
      });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Token invalid atau expired',
      data: null,
    });
  }
}
```

---

## 9. Folder Structure

```
auth-api/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── index.ts
│   ├── config/
│   │   └── env.ts
│   ├── middlewares/
│   │   ├── verifyApp.ts
│   │   ├── authMiddleware.ts
│   │   └── errorHandler.ts
│   ├── routes/
│   │   └── auth.routes.ts
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── validators/
│   │   └── auth.validator.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── hash.ts
│   │   └── envelope.ts
│   └── types/
│       └── express.d.ts
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 10. Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db
JWT_SECRET=super_secret_key_min_32_chars
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
PORT=3000
NODE_ENV=development
```

---

## 11. Security Requirements

- Password di-hash dengan bcrypt (salt rounds: 12)
- App secret di-hash dengan bcrypt
- Refresh token di-hash (SHA-256) sebelum disimpan di DB
- Rate limiting: max 5 login attempts per IP per 15 menit
- CORS: whitelist origin per-app jika ada web client
- Helmet.js untuk security headers
- Input validation di setiap endpoint (Zod)

---

## 12. Seed Script (Registrasi App)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const apps = [
    { appName: 'fitness_journal', secret: 'fj_secret_xxx' },
    { appName: 'warranty_tracker', secret: 'wt_secret_xxx' },
    { appName: 'sub_manager', secret: 'sm_secret_xxx' },
    { appName: 'english_conv', secret: 'ec_secret_xxx' },
  ];

  for (const app of apps) {
    const hashed = await bcrypt.hash(app.secret, 12);
    await prisma.app.upsert({
      where: { appName: app.appName },
      update: {},
      create: { appName: app.appName, appSecret: hashed },
    });
    console.log(`✓ App registered: ${app.appName}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 13. Dependencies

```json
{
  "dependencies": {
    "express": "^4.18",
    "@prisma/client": "^5.x",
    "jsonwebtoken": "^9.x",
    "bcrypt": "^5.x",
    "zod": "^3.x",
    "helmet": "^7.x",
    "cors": "^2.x",
    "express-rate-limit": "^7.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "prisma": "^5.x",
    "ts-node-dev": "^2.x",
    "@types/express": "^4.x",
    "@types/jsonwebtoken": "^9.x",
    "@types/bcrypt": "^5.x"
  }
}
```

---

## 14. Milestones

| Hari | Task |
|------|------|
| 1 | Setup project, Prisma schema, migration, seed apps |
| 2 | Middleware (verifyApp, authMiddleware, errorHandler) |
| 3 | Register & Login endpoint |
| 4 | Refresh & Logout endpoint, Logout All |
| 5 | Rate limiting, security hardening, validation |
| 6 | Testing (unit + integration), dokumentasi API |