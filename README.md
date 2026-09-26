# CBA Retail Banking & AML Transaction Monitoring System

A full-stack banking application with a configurable, explainable Anti-Money-Laundering (AML)
transaction monitoring engine. Customers can manage accounts and transact; bank employees and
compliance officers can investigate suspicious activity; administrators can reconfigure AML
detection rules at runtime with no code changes.

---

## 1. Project Overview

CBA Bank needs a way to let customers self-serve everyday banking (deposits, withdrawals,
transfers, payments) while giving its compliance team the tools to spot and investigate unusual
activity in real time. This project implements that end-to-end: every transaction is evaluated
the instant it's created by a rules engine and a deterministic risk-scoring model, and any
resulting alert is immediately visible on the compliance dashboard with a full explanation of
why it was raised.

## 2. Features

**Customer**
- Register / login / logout (JWT), view profile, account and balance
- Deposit, withdraw, transfer, and pay, with real-time AML evaluation
- Transaction history with filters, transaction detail view
- Downloadable account statements (PDF or CSV)

**Employee / Compliance Officer**
- Compliance dashboard with live KPIs and charts
- Customer search (name/email/phone/account number)
- Transaction search with filtering, sorting, pagination
- AML alert queue with full explainability (why it was flagged, risk breakdown, triggered rules)
- Alert review workflow (Open → Under Review → Cleared / Confirmed Suspicious)
- Freeze / unfreeze customer accounts

**Admin** (everything Employee can do, plus)
- Enable/disable AML rules and edit their thresholds/windows from the UI - no deploys required
- View system-wide audit logs

**Platform**
- JWT auth with role-based authorization enforced in middleware (never just hidden UI)
- Configurable AML rule engine (Large Transaction, High Frequency, Structuring)
- Deterministic, explainable 0-100 risk scoring (Amount + Frequency + Location + Customer)
- Full audit logging of security-relevant actions
- Standardized API response envelope, pagination, whitelisted sorting/filtering
- Seed script with demo data covering every AML scenario

## 3. Architecture

```
React SPA (Vite)
      |  Axios (JWT bearer)
      v
Express REST API  ──►  Auth middleware ──►  Role authorization middleware
      |
      v
Controllers  ──►  Services (business logic)  ──►  Mongoose Models  ──►  MongoDB
      |
      └──►  AML Engine (backend/src/aml)
              ├─ rules/largeTransaction.js
              ├─ rules/highFrequency.js
              ├─ rules/structuring.js
              └─ riskScoring.js
```

Every transaction write goes through `transactionService.createTransaction`, which:
1. Applies the balance change atomically (see §14 Database Consistency).
2. Persists the transaction.
3. Immediately calls `amlEngine.evaluateTransaction`, which loads **all AML rule configuration
   from the database** (not from code), evaluates each enabled rule, computes the deterministic
   risk score, and - if warranted - creates a single correlated `AmlAlert`.
4. Records an audit log entry.

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Tailwind CSS, Recharts, Axios, Vite |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | Joi |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize |
| Testing | Jest, Supertest, mongodb-memory-server |
| Statements | PDFKit (PDF), native CSV |
| Logging | winston |

## 5. Folder Structure

```
project-root/
├── frontend/
│   └── src/{components,pages,layouts,services,hooks,context,utils}
├── backend/
│   ├── src/{config,controllers,middleware,models,repositories*,routes,services,aml,validators,utils}
│   ├── tests/{unit,integration}
│   └── seeds/seed.js
├── README.md
├── .gitignore
└── .env.example
```
*Data access for this project is implemented through Mongoose models directly from services
(a thin repository layer), which is the idiomatic pattern for Mongoose-based Node APIs while
still keeping controllers free of persistence/query logic.

## 6. Prerequisites

- Node.js 18+ and npm
- A MongoDB instance reachable from the backend:
  - Local MongoDB (Community Server) **running as a single-node replica set** (recommended - see
    §8), **or**
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (Atlas clusters are always
    replica sets, so no extra setup is needed there)

> Why a replica set? The transfer/deposit/withdrawal logic uses real MongoDB multi-document
> transactions where available (`mongoose.startSession().withTransaction(...)`) so that a
> transfer's debit and credit legs, and the transaction record itself, commit or roll back
> together. Multi-document transactions require a replica set. **The code also works against a
> bare standalone `mongod`** - it detects that transactions aren't supported and automatically
> falls back to sequential atomic single-document updates with compensating rollback (see
> `backend/src/services/transactionService.js`), so nothing is required to run the app; the
> replica set is only recommended for the strongest consistency guarantees.

## 7. Installation

```bash
git clone <this-repo>
cd project-root

# Backend
cd backend
npm install
cp ../.env.example .env       # then edit backend/.env, see §9
npm run seed                  # populates demo data, see §12
npm run dev                   # starts the API on http://localhost:5000

# Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env          # VITE_API_URL should point at the backend
npm run dev                   # starts the SPA on http://localhost:5173
```

## 8. Database Setup

**Option A - Local MongoDB as a single-node replica set (recommended)**
```bash
mongod --dbpath /path/to/data --replSet rs0 --port 27017
# in a separate shell, one time only:
mongosh --eval "rs.initiate()"
```
Then set `MONGODB_URI=mongodb://127.0.0.1:27017/cba_banking_aml` in `backend/.env`.

**Option B - Local MongoDB, standalone (simplest, still fully supported)**
```bash
mongod --dbpath /path/to/data --port 27017
```
Works out of the box; the app automatically falls back to non-transactional atomic updates.

**Option C - MongoDB Atlas**
Create a free cluster, get its connection string, and set it as `MONGODB_URI` (it is always a
replica set, so full multi-document transactions are used automatically).

## 9. Environment Variables

See [`.env.example`](./.env.example) at the project root (copy into `backend/.env`):

| Variable | Description | Example |
|---|---|---|
| `PORT` | API port | `5000` |
| `NODE_ENV` | environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/cba_banking_aml` |
| `JWT_SECRET` | secret used to sign JWTs - **change this** | `<random 64+ char string>` |
| `JWT_EXPIRES_IN` | token lifetime | `1h` |
| `CLIENT_URL` | frontend origin, used for CORS | `http://localhost:5173` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | login/register rate-limit window | `900000` |
| `AUTH_RATE_LIMIT_MAX` | max attempts per window | `10` |
| `LOG_LEVEL` | winston log level | `info` |

The frontend reads `VITE_API_URL` from `frontend/.env` (see `frontend/.env.example`).

**Never commit a real `.env` file or real secrets.** `.gitignore` already excludes `.env` files.

## 10. Running the Backend

```bash
cd backend
npm run dev      # nodemon, auto-restarts on change
# or
npm start        # plain node
```
Health check: `GET http://localhost:5000/api/health`

## 11. Running the Frontend

```bash
cd frontend
npm run dev       # http://localhost:5173
npm run build     # production build to frontend/dist
npm run preview   # preview the production build
```

## 12. Seed Data

```bash
cd backend
npm run seed
```

This wipes and repopulates the configured database with:
- The 3 AML rules (all enabled, with sensible default configuration)
- A configurable location-risk table
- An admin and an employee account
- Six demo customers, each set up to independently demonstrate one AML scenario (see §13)
- All demo transactions are created **through the real transaction service and AML engine**,
  not hand-inserted, so every seeded risk score/alert was genuinely computed by the same code
  the running app uses.

## 13. Demo Credentials & AML Scenarios

| Role | Email | Password | Demonstrates |
|---|---|---|---|
| Admin | `admin@bank.com` | `Admin@1234` | Rule management, audit logs |
| Employee | `employee@bank.com` | `Employee@1234` | Compliance dashboard, alert review, account freeze |
| Customer | `alice.customer@bank.com` | `Customer@1234` | Scenario 1 - Large Transaction |
| Customer | `bob.customer@bank.com` | `Customer@1234` | Scenario 2 - High Frequency |
| Customer | `carol.customer@bank.com` | `Customer@1234` | Scenario 3 - Structuring |
| Customer | `dave.customer@bank.com` | `Customer@1234` | Scenario 4 - High/Critical Risk Score |
| Customer | `eve.customer@bank.com` | `Customer@1234` | Scenario 5 - Frozen Account (rejected transaction) |
| Customer | `frank.customer@bank.com` | `Customer@1234` | Normal, unflagged activity |

**Scenario 6 - Disabled Rule** is a live demo, not seeded data: log in as admin, go to
**AML Rule Management**, disable a rule (e.g. `LARGE_TRANSACTION`), then log in as any customer
and create a transaction that would otherwise trigger it (e.g. a ₹15,00,000 deposit). No alert
will be generated for that rule while it is disabled.

## 14. API Documentation

All responses use a standard envelope:
```json
// success
{ "success": true, "message": "...", "errorCode": null, "data": { } }
// failure
{ "success": false, "message": "...", "errorCode": "SOME_CODE", "data": null }
```
Paginated list endpoints also return a `meta: { page, limit, total, totalPages }` field.

Base URL: `http://localhost:5000/api`

### Auth
| Method | Path | Auth | Role | Body | Notes |
|---|---|---|---|---|---|
| POST | `/auth/register` | none | - | `{ name, email, phone, password }` | Creates a CUSTOMER user + Customer profile + Account (balance 0) |
| POST | `/auth/login` | none | - | `{ email, password }` | Returns `{ token, user, customer?, account? }` |
| POST | `/auth/logout` | Bearer | any | - | Revokes the current token |
| GET | `/auth/me` | Bearer | any | - | Returns the current user |

Example:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice.customer@bank.com","password":"Customer@1234"}'
```
```json
{ "success": true, "message": "Login successful", "errorCode": null,
  "data": { "token": "eyJ...", "user": { "role": "CUSTOMER", ... }, "account": { ... } } }
```
Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `409 DUPLICATE_EMAIL` / `DUPLICATE_PHONE`.

### Customers
| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | `/customers/:id` | Bearer | owner or EMPLOYEE/ADMIN | 403 if a customer requests someone else's profile |
| GET | `/customers/search?q=&riskLevel=&page=&limit=&sortBy=&sortDir=` | Bearer | EMPLOYEE, ADMIN | Search by name/email/phone/account number |

### Accounts
| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | `/accounts/:id` | Bearer | owner or EMPLOYEE/ADMIN | |
| PUT | `/accounts/:id/freeze` | Bearer | EMPLOYEE, ADMIN | body: `{ reason? }` → `409` if already frozen |
| PUT | `/accounts/:id/unfreeze` | Bearer | EMPLOYEE, ADMIN | body: `{ reason? }` → `409` if already active |

### Transactions
| Method | Path | Auth | Role | Body / Query |
|---|---|---|---|---|
| POST | `/transactions` | Bearer | CUSTOMER (own account), ADMIN | `{ accountId, type, amount, currency?, location?, description?, destinationAccountNumber? (TRANSFER), counterpartyName?, idempotencyKey? }` |
| GET | `/transactions/:accountId` | Bearer | owner or EMPLOYEE/ADMIN | `?type=&status=&minAmount=&maxAmount=&startDate=&endDate=&riskLevel=&isSuspicious=&page=&limit=&sortBy=&sortDir=` |
| GET | `/transactions/search` | Bearer | EMPLOYEE, ADMIN | same filters, plus `transactionId`, `accountId`, `customerId` |
| GET | `/transactions/statement/:accountId?startDate=&endDate=&format=pdf\|csv` | Bearer | owner or EMPLOYEE/ADMIN | Streams a file download |

Create example:
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"accountId":"<id>","type":"WITHDRAWAL","amount":1500000,"location":"Bengaluru, IN"}'
```
```json
{ "success": true, "message": "Transaction completed successfully", "errorCode": null,
  "data": { "transaction": { "riskScore": 68, "riskLevel": "HIGH", "isSuspicious": true, ... },
            "alertGenerated": true, "alert": { "triggeredRules": [ { "ruleCode": "LARGE_TRANSACTION", ... } ] } } }
```
Errors: `400 VALIDATION_ERROR | INSUFFICIENT_BALANCE | ACCOUNT_FROZEN | DESTINATION_ACCOUNT_FROZEN`,
`403 RESOURCE_OWNERSHIP_VIOLATION`, `404 ACCOUNT_NOT_FOUND | DESTINATION_ACCOUNT_NOT_FOUND`.

### AML Alerts
| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/aml/alerts?status=&severity=&riskLevel=&customerId=&page=&limit=&sortBy=&sortDir=` | Bearer | EMPLOYEE, ADMIN |
| GET | `/aml/alerts/:id` | Bearer | EMPLOYEE, ADMIN |
| PUT | `/aml/alerts/:id/review` | Bearer | EMPLOYEE, ADMIN | body: `{ status: UNDER_REVIEW\|CLEARED\|CONFIRMED_SUSPICIOUS, reviewNotes }` |

### AML Rules
| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/aml/rules` | Bearer | EMPLOYEE, ADMIN |
| PUT | `/aml/rules/:id` | Bearer | ADMIN | body: any of `{ ruleName, description, enabled, threshold, timeWindowMinutes, minTransactionCount, severity, config }` |
| PUT | `/aml/rules/:id/toggle` | Bearer | ADMIN | body: `{ enabled: boolean }` |

### Dashboard
| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/dashboard/stats` | Bearer | EMPLOYEE, ADMIN | Compliance dashboard totals + chart series |
| GET | `/dashboard/me` | Bearer | CUSTOMER | Customer-facing dashboard |

### Audit Logs
| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/audit-logs?action=&entityType=&userEmail=&page=&limit=` | Bearer | ADMIN |

### Health
| Method | Path | Auth |
|---|---|---|
| GET | `/health` | none | `{ status, database: { status, connected }, timestamp, uptimeSeconds }` |

An OpenAPI-style summary of every route (method, path, auth, role) is captured in the table
above; each route's Joi validator (in `backend/src/validators/`) is the single source of truth
for its exact request schema.

## 15. AML Rules

All three rules are stored in the `amlrules` collection (`AmlRule` model) and are loaded by
the engine at evaluation time - **no threshold is hard-coded in application logic**.

### LARGE_TRANSACTION
Flags a transaction whose amount is **strictly greater than** the configured `threshold`
(default ₹10,00,000). ₹10,00,000 exactly does **not** trigger; ₹10,00,001 does.
`backend/src/aml/rules/largeTransaction.js`

### HIGH_FREQUENCY
Flags a customer who makes `minTransactionCount` or more transactions (default 6, i.e. "more
than 5") within a **true rolling window** of `timeWindowMinutes` (default 10) ending at the
current transaction: `(now - windowMinutes, now]`. This is a sliding window relative to each
new transaction's own timestamp, not a calendar-minute bucket, and a transaction exactly
`timeWindowMinutes` in the past is excluded (outside the window).
`backend/src/aml/rules/highFrequency.js`

### STRUCTURING (threshold avoidance)
Flags a customer with `minTransactionCount` or more transactions (default 3) whose amounts fall
in the band `[threshold × (1 − percentBelowThreshold/100), threshold)` (default: 10% below
₹10,00,000, i.e. ₹9,00,000-₹9,99,999.99) within a rolling `timeWindowMinutes` window (default
1440 = 24h). Example: ₹9,80,000 / ₹9,75,000 / ₹9,90,000 / ₹9,95,000 all fall in the default
band; once 3 of them occur within the window, the rule triggers.
`backend/src/aml/rules/structuring.js`

### Rule configuration (admin, no code changes)
Each `AmlRule` document has: `ruleCode`, `ruleName`, `description`, `ruleType`, `enabled`,
`threshold`, `timeWindowMinutes`, `minTransactionCount`, `config` (free-form JSON, e.g.
`{ percentBelowThreshold }`), `severity`. Admins edit these via **AML Rule Management** in the
UI or `PUT /api/aml/rules/:id` / `PUT /api/aml/rules/:id/toggle`. A disabled rule is skipped
entirely by the engine for new transactions.

### Alert correlation
If multiple rules trigger for the same transaction, they are correlated into **one** `AmlAlert`
document (`triggeredRules: [{ ruleCode, ruleName, reason }]`) rather than one alert per rule -
see `evaluateTransaction` in `backend/src/aml/engine.js`.

## 16. Risk Scoring Methodology

```
Risk Score = Amount Risk (0-30) + Frequency Risk (0-30) + Location Risk (0-20) + Customer Risk (0-20)
```
Each component is independently capped, so the total can never exceed 100 or fall below 0.
Full implementation and inline documentation: `backend/src/aml/riskScoring.js`.

- **Amount Risk (0-30):** linear against the `LARGE_TRANSACTION` threshold -
  `min(30, round((amount / threshold) * 30))`.
- **Frequency Risk (0-30):** reuses the same rolling-window transaction count as
  `HIGH_FREQUENCY` - `min(30, round((recentCount / minTransactionCount) * 30))`.
- **Location Risk (0-20):** looks up the transaction's location in the configurable
  `LocationRisk` table. A configured entry's own `riskScore` is used; an unlisted but
  customer-familiar location scores 2; an unlisted, unfamiliar location scores 10. No real-world
  country/jurisdiction is hard-coded as suspicious - the table is fully admin-editable data.
- **Customer Risk (0-20):** `base(customerRiskLevel)` (LOW=0, MEDIUM=6, HIGH=12, CRITICAL=18)
  + `min(9, confirmedSuspiciousAlerts × 3)` + `2` if the account is under 30 days old, capped at 20.

**Risk levels** (exact boundaries, all covered by boundary tests):

| Score | Level |
|---|---|
| 0-30 | LOW |
| 31-60 | MEDIUM |
| 61-80 | HIGH |
| 81-100 | CRITICAL |

Every score is deterministic - identical inputs always produce identical output - and every
alert's detail page shows the full breakdown so a reviewer can see exactly why a transaction was
flagged (see §"AML Explainability" in the Compliance UI).

## 17. User Roles

| Role | Can do |
|---|---|
| CUSTOMER | Register/login, view own profile/account/transactions, transact, download statement |
| EMPLOYEE | Everything a compliance analyst needs: search customers/transactions, review AML alerts, freeze/unfreeze accounts |
| ADMIN | Everything EMPLOYEE can, plus AML rule configuration and audit log access |

Authorization is enforced in **both** the UI (routes/menus hidden per role) and the **API**
(`authorize(...)` middleware on every protected route) - the UI never relies on hiding buttons
alone.

## 18. Testing

```bash
cd backend
npm test
```

The suite includes unit tests (AML rules, risk scoring, validators - no database required) and
integration/API/E2E tests (Supertest against the real Express app + a MongoDB instance).
Coverage includes:
- **Boundary tests**: ₹10,00,000 vs ₹10,00,001; exactly 5 vs 6 transactions; the 10-minute
  window boundary; risk score boundaries 30/31/60/61/80/81/100.
- **Negative tests**: invalid login, duplicate registration, invalid/expired/missing token,
  insufficient role, missing fields, invalid amount/type, frozen-account transactions,
  insufficient balance, nonexistent account/alert/rule, invalid rule configuration.
- **Integration**: registration → login → transaction → AML alert → employee review; account
  freeze/unfreeze; AML rule enable/disable actually changing engine behaviour.
- **E2E**: the full primary business journey end-to-end (`tests/integration/e2e.test.js`).

Integration tests use `mongodb-memory-server` to spin up a throwaway MongoDB replica set
automatically - no separate database setup is needed to run them. If that download is not
possible in a given environment (e.g. a network-restricted sandbox), those suites are **skipped
gracefully** (not failed) and the DB-independent unit tests still run in full; set `MONGO_URI`
to point at any reachable MongoDB to force the full suite to run there instead.

## 19. Build Commands

```bash
# Backend - no build step; run directly with Node
cd backend && npm start

# Frontend - production build
cd frontend && npm run build   # outputs to frontend/dist
cd frontend && npm run preview # serve the production build locally
```

## 20. Troubleshooting

| Symptom | Fix |
|---|---|
| `MongoDB connection error` on startup | Check `MONGODB_URI` in `backend/.env` and that MongoDB is running/reachable |
| `401 AUTH_TOKEN_EXPIRED` | Log in again; tokens expire after `JWT_EXPIRES_IN` |
| `403 INSUFFICIENT_ROLE` | You're logged in with a role that can't access that page/endpoint |
| Frontend can't reach the API | Check `VITE_API_URL` in `frontend/.env` matches the backend's `PORT`, and `CLIENT_URL` in `backend/.env` matches the frontend's origin (CORS) |
| Seed script hangs / fails to connect | Ensure MongoDB is running before `npm run seed` |
| `npm test` skips most suites | No reachable MongoDB / no outbound access to download `mongodb-memory-server`'s binary - see §18 |

## 21. Security Considerations

- Passwords hashed with bcrypt (12 salt rounds), never returned by any API response
- JWTs are short-lived, carry minimal claims (`sub`, `role`, `email` only), and are checked
  against a `RevokedToken` collection on every request so `/auth/logout` genuinely invalidates a
  token before its natural expiry
- Every protected route runs through `authenticate` (valid/expired/missing/invalid token → 401)
  and, where relevant, `authorize(...roles)` (wrong role → 403)
- Resource-ownership checks (`RESOURCE_OWNERSHIP_VIOLATION`) prevent a customer from reading or
  transacting on another customer's account/profile
- `helmet` sets secure HTTP headers; `cors` restricts cross-origin requests to `CLIENT_URL`
- `express-mongo-sanitize` strips `$`/`.` operators from user input to block NoSQL injection
- `express-rate-limit` throttles `/auth/login` and `/auth/register` against brute force
- All input is validated server-side with Joi (client-side validation is UX only, never trusted)
- Standardized error responses never leak stack traces or internal details in production
- Structured logging (winston) redacts password/token/secret fields automatically and is
  silenced during tests
- `.env` is git-ignored; `.env.example` documents required variables with placeholder values only

## 22. Primary User Journey

**Customer:** Register → Login → View account/balance → Perform a transaction → transaction is
persisted → AML engine evaluates it → risk score is calculated → an alert is created if
warranted.

**Employee:** Login → Dashboard → View suspicious transactions → Open an AML alert → Review the
transaction, risk score and triggered rules → Enter a decision and notes → Resolve the alert.

**Admin:** Login → AML Rule Management → Enable/disable a rule or change its configuration →
Create a test transaction (as any customer) → Observe the AML engine respect the new
configuration immediately, no deploy required.

All of the above is exercised by `backend/tests/integration/e2e.test.js`.

## 23. Backup / Restore (MongoDB)

**Backup** (dumps the whole database to a local folder):
```bash
mongodump --uri="$MONGODB_URI" --out=./backups/$(date +%Y%m%d_%H%M%S)
```
**Restore** (into a running MongoDB instance - drops and replaces existing collections with the
same names found in the dump):
```bash
mongorestore --uri="$MONGODB_URI" --drop ./backups/<timestamp-folder>
```
For Atlas, the same `mongodump`/`mongorestore` commands work against the Atlas connection
string; Atlas also offers automated cloud backups/point-in-time recovery in its UI for
production use. Recommended practice: run `mongodump` on a schedule (e.g. nightly via cron),
retain a rolling window of dumps off-box, and periodically rehearse a `mongorestore` into a
throwaway database to confirm backups are actually restorable.

## 24. Final Verification Checklist

See [`VERIFICATION.md`](./VERIFICATION.md) for the full requirement-by-requirement checklist
with implementation locations, and for a plain statement of the one environment limitation
encountered (outbound access to download a MongoDB binary was not available in the build
sandbox - see that document for exactly what was and wasn't executed as a result, and what a
normal/local environment gets automatically).
