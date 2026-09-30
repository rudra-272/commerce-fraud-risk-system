# Commerce Order & Fraud Risk Management System

A full-stack order-intake system that scores every incoming order in real time
against a configurable rule-based fraud engine, then routes it to
**Approve**, **Manual Review**, or **Block** based on the resulting risk band.

## Features

- **Order intake API** — create orders with customer, payment, and address details
- **Rule-based fraud engine** (`services/fraudEngine.js`) scoring on:
  - High order value
  - Billing/shipping country mismatch
  - IP country vs. billing country mismatch
  - New account placing a high-value order
  - Order velocity (multiple orders from the same email within an hour)
  - Denylisted email / card BIN
  - Disposable email domains
  - Abnormally high quantity
- **Risk bands**: LOW (0–29) · MEDIUM (30–59) · HIGH (60–79) · CRITICAL (80–100)
- **Hard-block overrides**: a denylisted email or card BIN always forces CRITICAL / Block, even if the additive score alone wouldn't reach that band — a confirmed denylist hit is treated as a certainty signal, not just one more weighted factor
- **Input validation**: amount/quantity must be positive numbers, email must be well-formed, and country codes are normalized to uppercase before comparison (so `"us"` vs `"US"` isn't a false address-mismatch)
- **Dashboard UI** — submit orders, see live stats, filter by risk level, drill
  into which rules fired for any order, and manually override its status
- **JSON-file persistence** — zero external database setup required
- **Unit tests** (`test/fraudEngine.test.js`) covering the scoring engine's core rules, the score cap, and the hard-block override, using Node's built-in test runner (no extra dependency)

## Tech Stack

| Layer    | Technology                     |
|----------|---------------------------------|
| Backend  | Node.js, Express                |
| Storage  | JSON file (`data/orders.json`)  |
| Frontend | Vanilla HTML/CSS/JS             |

## Project Structure

```
commerce-fraud-system/
├── server.js              # Express app entry point
├── routes/orders.js        # Order REST endpoints
├── services/fraudEngine.js # Rule-based scoring engine
├── models/orderStore.js    # JSON-file data access layer
├── data/
│   ├── orders.json         # Persisted orders (seeded with samples)
│   └── seed.js              # Sample-data generator
└── public/                  # Dashboard (HTML/CSS/JS)
```

## Getting Started

```bash
npm install
npm run seed     # optional: populate sample orders
npm test         # run the fraud-engine unit tests
npm start
```

Then open **http://localhost:3000** in your browser.

## API Reference

| Method | Endpoint                  | Description                                |
|--------|----------------------------|---------------------------------------------|
| GET    | `/api/orders`               | List all orders (optional `?riskLevel=`)    |
| GET    | `/api/orders/:id`            | Get a single order                          |
| POST   | `/api/orders`                 | Submit a new order for scoring              |
| PATCH  | `/api/orders/:id/status`      | Manually override an order's status         |
| GET    | `/api/stats`                   | Dashboard summary counts                    |

### Example: submit an order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "buyer@example.com",
    "amount": 1500,
    "billingCountry": "US",
    "shippingCountry": "NG",
    "accountAgeDays": 0
  }'
```

## Deployment

This app is a stateless Node/Express server and deploys as-is to Render,
Railway, or Vercel-with-serverless-adapter. On Render/Railway: connect the
GitHub repo, set the start command to `npm start`, and it will build and
serve automatically (the JSON data file resets on redeploy unless a
persistent disk is attached — that's expected for a demo/student project).

## Design Notes

- **Why no write-locking on `orders.json`**: Node runs the request handler and
  `fs.readFileSync`/`writeFileSync` on a single thread, so two concurrent
  `POST /api/orders` calls can't interleave mid-read/write within one process
  — the synchronous I/O already serializes them. A real production system
  would still use a proper database with transactions; this is a deliberate
  scope trade-off for a file-backed demo, not an oversight.
- **Why denylist rules force a hard block**: a matched email/card-BIN denylist
  entry is a confirmed-bad-actor signal, not a probabilistic one, so it
  overrides the additive score instead of just contributing weight to it.

## Author

Rudra — BTech Computer Engineering
