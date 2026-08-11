# Express.js Base API

Production-ready Express.js REST API boilerplate with authentication, Prisma ORM, Swagger docs, Docker, and more.

## Features

- 🔐 **Authentication** — Register & login with bcrypt + JWT
- 🗄️ **Prisma ORM** — SQLite default, switchable to PostgreSQL/MySQL
- 🛡️ **Security** — Helmet, CORS, rate limiting
- ✅ **Validation** — Input validation (express-validator) + env validation (zod)
- 📝 **Logging** — Structured logging with pino
- 📖 **API Docs** — Swagger/OpenAPI 3.0 at `/api-docs`
- 🐳 **Docker** — Dockerfile + docker-compose ready
- 🧪 **Testing** — Jest + Supertest integration tests
- ⚡ **ESM** — Native ES modules

## Project Structure

```
src/
├── app.js                     # Express app setup
├── server.js                  # Entry point
├── logger.js                  # Pino logger instance
├── config/
│   ├── index.js               # Centralized config
│   └── env.js                 # Zod env validation
├── routes/
│   ├── index.js               # Route aggregator
│   └── auth.routes.js         # Auth endpoints
├── controllers/
│   └── auth.controller.js     # Request/response handling
├── services/
│   └── auth.service.js        # Business logic
├── repositories/
│   └── user.repository.js     # Data access (Prisma)
├── middlewares/
│   ├── errorHandler.js        # Global error handler
│   ├── notFound.js            # 404 handler
│   └── validate.js            # Validation middleware
├── validators/
│   └── auth.validator.js      # Input validation rules
├── docs/
│   └── swagger.js             # Swagger/OpenAPI config
└── utils/
    └── response.js            # Standard response helpers
```

## Quick Start

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/FadlanBM/Express-JS-Base.git
cd Express-JS-Base

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migration
npx prisma migrate dev

# Start development server
npm run dev
```

The server starts at `http://localhost:3000`.

### Docker

```bash
docker-compose up --build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api-docs` | Swagger UI |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login & get JWT token |

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"123456"}'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"123456"}'
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment (`development` \| `production` \| `test`) |
| `JWT_SECRET` | — | JWT signing secret (min 16 chars) |
| `JWT_EXPIRES_IN` | `1d` | JWT expiration time |
| `DATABASE_URL` | `file:./dev.db` | Database connection string |
| `LOG_LEVEL` | `info` | Pino log level |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

## Switching Database

### PostgreSQL

1. Update `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/auth_api
```

2. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Run migration:
```bash
npx prisma migrate dev
```

### MySQL

Same steps as PostgreSQL, use `provider = "mysql"`.

## Testing

```bash
npm test
```

Tests use SQLite in-memory database — no setup needed.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm start` | Start production server |
| `npm test` | Run test suite |

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5
- **ORM:** Prisma 6
- **Auth:** bcryptjs + jsonwebtoken
- **Validation:** express-validator + zod
- **Logging:** pino + pino-pretty
- **Security:** helmet, cors, express-rate-limit
- **Docs:** swagger-jsdoc + swagger-ui-express
- **Testing:** Jest + Supertest
- **Container:** Docker

## License

ISC
