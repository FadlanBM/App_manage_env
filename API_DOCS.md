# Auth API Documentation — Multi-App Dual-Token JWT

Base URL: `http://localhost:3000`

---

## Konsep

Sistem autentikasi **multi-app** dengan **dual-token JWT** (Access Token & Refresh Token). Setiap aplikasi Flutter yang terhubung harus terdaftar sebagai `App` di database. Satu akun user bisa login di semua app, tapi session/token terisolasi per-app.

### Headers Wajib (Semua Endpoint Auth)

| Header | Deskripsi | Contoh |
|--------|-----------|--------|
| `X-App-Id` | Nama app yang terdaftar | `fitness_journal` |
| `X-App-Secret` | Secret key app (plaintext) | `fj_secret_xxx` |

### Token

| Tipe | Format | Lokasi | TTL |
|------|--------|--------|-----|
| Access Token | JWT (HS256) | Header `Authorization: Bearer <token>` | 15 menit |
| Refresh Token | Random hex string | Body request | 30 hari |

### Access Token Payload

```json
{
  "user_id": "uuid-123",
  "app_id": "fitness_journal",
  "email": "andi@mail.com",
  "iat": 1691234000,
  "exp": 1691234900
}
```

---

## Response Format

### Sukses (HTTP 2xx)

```json
{
  "status": "success",
  "message": "Deskripsi singkat",
  "data": { ... }
}
```

### Gagal Validasi (HTTP 422)

```json
{
  "status": "fail",
  "message": "Validation error",
  "data": {
    "email": "Valid email is required",
    "password": "Password must be at least 6 characters"
  }
}
```

### Error (HTTP 4xx/5xx)

```json
{
  "status": "error",
  "message": "Alasan kegagalan",
  "data": null
}
```

---

## Endpoints

### 1. Register

Daftar akun baru dan langsung mendapat token pair.

```
POST /api/auth/register
```

**Headers:**

| Header | Required |
|--------|----------|
| `X-App-Id` | ✅ |
| `X-App-Secret` | ✅ |

**Request Body:**

```json
{
  "name": "Andi",
  "email": "andi@mail.com",
  "password": "password123"
}
```

| Field | Type | Validasi |
|-------|------|----------|
| `name` | string | Wajib, tidak boleh kosong |
| `email` | string | Wajib, format email valid |
| `password` | string | Wajib, minimal 6 karakter |

**Response Sukses (201):**

```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "a1b2c3d4e5f6...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Andi",
      "email": "andi@mail.com"
    }
  }
}
```

**Response Error:**

| Status | Message |
|--------|---------|
| 401 | App credentials required / App not registered / Invalid app secret |
| 409 | Email already registered |
| 422 | Validation error |

---

### 2. Login

Login dengan email dan password, mendapat token pair baru.

```
POST /api/auth/login
```

**Headers:**

| Header | Required |
|--------|----------|
| `X-App-Id` | ✅ |
| `X-App-Secret` | ✅ |

**Request Body:**

```json
{
  "email": "andi@mail.com",
  "password": "password123"
}
```

| Field | Type | Validasi |
|-------|------|----------|
| `email` | string | Wajib, format email valid |
| `password` | string | Wajib |

**Response Sukses (200):**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "a1b2c3d4e5f6...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Andi",
      "email": "andi@mail.com"
    }
  }
}
```

**Response Error:**

| Status | Message |
|--------|---------|
| 401 | App credentials required / App not registered / Invalid app secret / Invalid email or password |
| 422 | Validation error |

---

### 3. Refresh Token

Tukar refresh token lama dengan token pair baru. Refresh token lama otomatis di-revoke.

```
POST /api/auth/refresh
```

**Headers:**

| Header | Required |
|--------|----------|
| `X-App-Id` | ✅ |
| `X-App-Secret` | ✅ |

**Request Body:**

```json
{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

| Field | Type | Validasi |
|-------|------|----------|
| `refresh_token` | string | Wajib |

**Response Sukses (200):**

```json
{
  "status": "success",
  "message": "Token refreshed",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...(baru)",
    "refresh_token": "x9y8z7w6v5u4...(baru)"
  }
}
```

**Response Error:**

| Status | Message |
|--------|---------|
| 401 | App credentials required / Invalid or expired refresh token |
| 422 | Validation error |

> **⚠️ Penting:** Refresh token hanya bisa dipakai **1 kali**. Setelah digunakan, token lama otomatis di-revoke. Refresh token dari App A **tidak bisa dipakai** di App B (isolasi per-app).

---

### 4. Logout (Per-App)

Revoke semua refresh token untuk user di app ini saja.

```
POST /api/auth/logout
```

**Headers:**

| Header | Required |
|--------|----------|
| `X-App-Id` | ✅ |
| `X-App-Secret` | ✅ |
| `Authorization` | ✅ `Bearer <access_token>` |

**Request Body:** _(tidak diperlukan)_

**Response Sukses (200):**

```json
{
  "status": "success",
  "message": "Logged out successfully",
  "data": null
}
```

**Response Error:**

| Status | Message |
|--------|---------|
| 401 | App credentials required / Token required / Token invalid atau expired / Token app mismatch |

---

### 5. Logout All Apps

Revoke **semua** refresh token di **semua** app untuk user ini.

```
POST /api/auth/logout-all
```

**Headers:**

| Header | Required |
|--------|----------|
| `X-App-Id` | ✅ |
| `X-App-Secret` | ✅ |
| `Authorization` | ✅ `Bearer <access_token>` |

**Request Body:** _(tidak diperlukan)_

**Response Sukses (200):**

```json
{
  "status": "success",
  "message": "Logged out from all apps",
  "data": null
}
```

**Response Error:**

| Status | Message |
|--------|---------|
| 401 | App credentials required / Token required / Token invalid atau expired / Token app mismatch |

---

### 6. Health Check

```
GET /health
```

**Response (200):**

```json
{
  "status": "ok"
}
```

---

## Isolasi Per-App

| Skenario | Hasil |
|----------|-------|
| User login di App A | Dapat token pair khusus App A |
| User login di App B | Dapat token pair terpisah, session berbeda |
| Logout dari App A | Hanya revoke token App A |
| Logout All | Revoke semua token di semua app |
| Refresh token App A dipakai di App B | **Ditolak** — `app_id` tidak cocok |
| Access token App A dipakai di App B | **Ditolak** — token app mismatch |

---

## App Secret Key

Setiap app bisa memiliki **beberapa secret key** sekaligus (untuk key rotation). Client mengirim salah satu secret yang masih aktif via header `X-App-Secret`.

| Kolom | Deskripsi |
|-------|-----------|
| `label` | Identifikasi key, misal `"default"`, `"android"`, `"ios"`, `"v2"` |
| `secret` | Disimpan sebagai hash bcrypt di database |
| `revoked_at` | `null` = aktif, ada timestamp = sudah dinonaktifkan |

### Apps Terdaftar (Seed)

| App Name | Secret (Plaintext) | Label |
|----------|--------------------|-------|
| `fitness_journal` | `fj_secret_xxx` | default |
| `warranty_tracker` | `wt_secret_xxx` | default |
| `sub_manager` | `sm_secret_xxx` | default |
| `english_conv` | `ec_secret_xxx` | default |

---

## Contoh Penggunaan (cURL)

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-App-Id: fitness_journal" \
  -H "X-App-Secret: fj_secret_xxx" \
  -d '{"name":"Andi","email":"andi@mail.com","password":"password123"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-App-Id: fitness_journal" \
  -H "X-App-Secret: fj_secret_xxx" \
  -d '{"email":"andi@mail.com","password":"password123"}'
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-App-Id: fitness_journal" \
  -H "X-App-Secret: fj_secret_xxx" \
  -d '{"refresh_token":"a1b2c3d4e5f6..."}'
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "X-App-Id: fitness_journal" \
  -H "X-App-Secret: fj_secret_xxx" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Logout All

```bash
curl -X POST http://localhost:3000/api/auth/logout-all \
  -H "X-App-Id: fitness_journal" \
  -H "X-App-Secret: fj_secret_xxx" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Swagger UI

Dokumentasi interaktif tersedia di:

```
http://localhost:3000/api-docs
```

JSON spec:

```
http://localhost:3000/api-docs.json
```

---

## Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `3000` | Port server |
| `NODE_ENV` | `development` | Environment |
| `JWT_SECRET` | — | Secret key JWT (min 16 chars) |
| `ACCESS_TOKEN_TTL` | `15m` | Masa berlaku access token |
| `REFRESH_TOKEN_TTL` | `30d` | Masa berlaku refresh token |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `LOG_LEVEL` | `info` | Level logging (pino) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Window rate limit (ms) |
| `RATE_LIMIT_MAX` | `100` | Max request per window |

---

## Rate Limiting

- **Window:** 15 menit (default)
- **Max:** 100 request per IP per window
- **Scope:** Semua route `/api/*`

Response saat limit tercapai:

```json
{
  "status": "error",
  "message": "Too many requests, please try again later",
  "data": null
}
```
