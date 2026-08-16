# Nanak Migration Backend (Runway CRM)

Node.js + Express + MongoDB API for the Migration Lead Desk.

## Setup

1. Copy env file:
   ```bash
   cp .env.example .env
   ```

2. Set your MongoDB connection string in `.env`:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-long-random-secret
   INTAKE_API_KEY=your-intake-key
   PORT=5001
   CORS_ORIGIN=http://localhost:5174
   ```

3. Install and seed:
   ```bash
   npm install
   npm run seed
   npm run dev
   ```

Default seed admin (from `.env.example`):
- Email: `admin@nanakmigration.com.au`
- Password: `RunwayAdmin2026!`

## API

| Route | Auth | Description |
|-------|------|-------------|
| `POST /api/auth/login` | — | Admin login |
| `GET /api/auth/me` | JWT | Current user |
| `POST /api/intake` | Intake key | Public lead capture (future iframe/WordPress) |
| `GET /api/admin/leads/*` | JWT | Leads CRM |
| `GET /api/admin/bookings/*` | JWT | Bookings module |

## Public intake (future wiring)

When you embed forms or WordPress widgets:

```http
POST /api/intake
Content-Type: application/json
x-nanak-intake-key: <INTAKE_API_KEY>

{
  "widget": "pr-points-calculator",
  "page": "/calculators/pr-points",
  "utm": { "source": "blog" },
  "fields": { "occupation": "261313" },
  "result": { "summary": "65 points · weak English" },
  "lead": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "mobile": "0412345678",
    "subclass": "485",
    "expiry": "2026-12-01",
    "goal": "190",
    "consent": { "email": true, "wa": true }
  }
}
```

Honeypot field `company_website` silently accepts bots.

## Scripts

- `npm run dev` — development server with nodemon
- `npm run start` — production
- `npm run seed` — admin user, team, demo leads & bookings
- `npm run build` — syntax check
