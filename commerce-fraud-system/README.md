# Commerce Order & Fraud Risk Management System

A full-stack order-intake and fraud-risk management system that evaluates incoming orders using a rule-based fraud engine and automatically routes them to `APPROVE`, `MANUAL REVIEW`, or `BLOCK` based on the calculated risk score.

🔗 **Live Demo:** https://commerce-fraud-risk-system.vercel.app/

## Overview

The system simulates a commerce fraud-risk workflow where every incoming order is evaluated against multiple fraud indicators such as order value, geographic mismatches, account age, order velocity, denylisted information, disposable email domains, and unusually high quantities.

Each triggered rule contributes to the overall risk score. The final score is mapped to a risk band and used to determine the recommended order status.

## Features

### Order Intake API

Create and process orders through a REST API containing customer, payment, and address information.

### Rule-Based Fraud Engine

Orders are evaluated using multiple configurable fraud indicators:

- High order value
- Billing and shipping country mismatch
- IP country and billing country mismatch
- New account placing a high-value order
- Order velocity from the same email address
- Denylisted email addresses
- Denylisted card BINs
- Disposable email domains
- Abnormally high order quantity

### Risk Scoring

Each triggered rule contributes to the order's risk score.

The resulting score is classified into four risk bands:

| Risk Band | Score |
|---|---:|
| LOW | 0–29 |
| MEDIUM | 30–59 |
| HIGH | 60–79 |
| CRITICAL | 80–100 |

The risk band is then used by the application to determine the appropriate order status.

### Dashboard

The web dashboard provides:

- Order submission
- Live order statistics
- Risk-level filtering
- Order inspection
- Triggered fraud-rule details
- Risk-score visibility
- Manual order-status override

### Local JSON Persistence

The application can run locally without requiring an external database.

Orders are stored using a JSON-based storage layer, with an in-memory fallback available for environments where persistent filesystem storage is unavailable.

### Serverless-Compatible Deployment

The application is deployed on Vercel using a serverless-compatible Express configuration.

The deployed demo uses a storage fallback and should be considered a demonstration environment rather than production-grade persistent storage.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Storage | JSON File / In-Memory Fallback |
| API | REST |
| Testing | Node.js Test Runner |
| Deployment | Vercel |

## Project Structure

    commerce-fraud-system/
    │
    ├── server.js
    │
    ├── routes/
    │   └── orders.js
    │
    ├── services/
    │   └── fraudEngine.js
    │
    ├── models/
    │   └── orderStore.js
    │
    ├── data/
    │   ├── orders.json
    │   └── seed.js
    │
    ├── public/
    │   ├── index.html
    │   ├── app.js
    │   └── style.css
    │
    └── test/
        └── fraudEngine.test.js

## Fraud Decision Flow

    Incoming Order
          │
          ▼
    Order Validation
          │
          ▼
    Fraud Rule Evaluation
          │
          ▼
    Risk Score Calculation
          │
          ▼
    Risk Band Classification
          │
          ├───────────────┬────────────────┐
          ▼               ▼                ▼
       APPROVE      MANUAL REVIEW       BLOCK

## Getting Started

### 1. Clone the Repository

    git clone https://github.com/rudra-272/commerce-fraud-risk-system.git
    cd commerce-fraud-risk-system/commerce-fraud-system

### 2. Install Dependencies

    npm install

### 3. Seed Sample Data

    npm run seed

### 4. Run Tests

    npm test

### 5. Start the Application

    npm start

The application will be available at:

    http://localhost:3000

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List all orders |
| `GET` | `/api/orders/:id` | Get a single order |
| `POST` | `/api/orders` | Submit a new order for fraud scoring |
| `PATCH` | `/api/orders/:id/status` | Manually override order status |
| `GET` | `/api/stats` | Get dashboard summary statistics |
| `GET` | `/health` | Health check |

## Example: Submit an Order

### Request

    curl -X POST http://localhost:3000/api/orders \
      -H "Content-Type: application/json" \
      -d '{
        "customerEmail": "buyer@example.com",
        "amount": 1500,
        "billingCountry": "US",
        "shippingCountry": "NG",
        "accountAgeDays": 0
      }'

### Request Flow

    POST /api/orders
           │
           ▼
    Validate Order
           │
           ▼
    Run Fraud Rules
           │
           ▼
    Calculate Risk Score
           │
           ▼
    Assign Risk Band
           │
           ▼
    Determine Order Status

## Testing

The fraud engine is tested using the built-in Node.js Test Runner.

Run the complete test suite with:

    npm test

The tests cover the fraud-scoring logic and rule evaluation implemented by the application.

## Deployment

The application is deployed on Vercel:

https://commerce-fraud-risk-system.vercel.app/

The deployment uses a serverless-compatible Express configuration and a storage fallback so the application can run without requiring an external database.

Because serverless environments do not provide guaranteed persistent local filesystem storage, the deployed version is intended primarily for demonstration purposes.

## Future Improvements

Potential extensions to the system include:

- PostgreSQL or MongoDB persistence
- Redis-based order-velocity tracking
- Authentication and role-based access control
- Configurable fraud rules through an administration interface
- Event-driven order processing
- External payment-risk intelligence
- Machine-learning-based fraud scoring
- Audit logs for manual risk decisions
- Real-time notifications for high-risk orders

## Key Highlights

- REST-based order intake system
- Rule-based fraud risk scoring
- Automated risk-band classification
- Automatic order routing
- Dashboard for fraud monitoring
- Triggered-rule visibility
- Manual order-status overrides
- Automated fraud-engine testing
- Serverless-compatible deployment

## Author

**Rudra Parashar**

B.Tech Computer Science & Engineering