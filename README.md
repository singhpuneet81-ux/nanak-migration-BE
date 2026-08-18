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
| `POST /api/intake` | Public widget or intake key | Lead capture (hero chatbot + other widgets) |
| `GET /api/admin/leads/*` | JWT | Leads CRM |
| `GET /api/admin/bookings/*` | JWT | Bookings module |

## Public intake (WordPress / iframes)

Hero chatbot (`/herosection_chatbot` on the admin) posts here **without** an intake key:

```http
POST /api/intake
Content-Type: application/json

{
  "widget": "herosection_chatbot",
  "page": "/",
  "result": { "summary": "Work & Career · Onshore · employer sponsored → TSS 482", "code": "482" },
  "lead": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "mobile": "0412345678",
    "subclass": "482",
    "goal": "482",
    "location": "In Australia (onshore)",
    "source": "Pathway assessment",
    "consent": { "email": true }
  }
}
```

Other widgets still send `x-nanak-intake-key: <INTAKE_API_KEY>`.

Honeypot field `company_website` silently accepts bots.

## Scripts

- `npm run dev` — development server with nodemon
- `npm run start` — production
- `npm run seed` — admin user, team, demo leads & bookings
- `npm run build` — syntax check
