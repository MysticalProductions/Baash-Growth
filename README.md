# BAASH GROWTH — Multi-Tenant Communication CRM & Marketing Platform

BAASH GROWTH is an enterprise-grade multi-tenant communication CRM and marketing platform engineered for the **BAASH** ecosystem (official: [baash.in](https://baash.in/)).

It allows registered vendors on BAASH to purchase communication credits and execute SMS, WhatsApp, and Email marketing campaigns with strict multi-tenant isolation, while BAASH functions as the central platform authority.

---

## 🎨 BAASH Design System & Brand Identity

The user interface matches the authentic branding extracted directly from **baash.in**:
- **Background**: `#0A0A0F` (True dark canvas)
- **Surfaces**: `#12121A` (Navigation & Sidebar)
- **Cards**: `#1A1A2E` (Containers & Modals)
- **Borders**: `#2A2A3E`
- **Primary Brand Color**: `#7B35E8` (BAASH Purple)
- **Secondary Brand Color**: `#F72585` (BAASH Magenta / Pink)
- **Brand Gradient**: `linear-gradient(135deg, #F72585 0%, #7B35E8 100%)`
- **Typography**: Inter (`font-sans`)
- **Official Assets**: Direct inclusion of official `/logo.png` and `/favicon.ico`

---

## 🛠 Technology Stack

### Frontend
- **React.js 18** with **TypeScript**
- **Vite**
- **Tailwind CSS** (configured with exact BAASH tokens)
- **React Router v6**
- **TanStack Query (React Query)**
- **Lucide React** (icons)
- **Recharts** (visualization)
- **Axios** (with automatic JWT silent refresh interceptor)

### Backend
- **Node.js** & **NestJS 10**
- **TypeScript**
- **PostgreSQL 16** via **Prisma ORM**
- **Redis 7** (caching and token invalidation)
- **JWT & HTTP-Only Secure Cookies**
- **Swagger / OpenAPI 3.0** (`/api/docs`)
- **Argon2 / Bcrypt** password hashing (12 rounds)

### Multi-Tenancy Architecture
- **Shared-Database, Shared-Schema Multi-Tenancy**
- Every tenant resource is scoped with `vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE`
- Tenant context derived strictly from authenticated user session (`@CurrentTenant()`, `TenantGuard`)
- Client-supplied `vendor_id` values in request bodies or query parameters are never trusted and cannot overwrite user scoping (preventing horizontal privilege escalation)
- Role-based and permission-based access control (`@RequirePermissions(...)`, `PermissionsGuard`)
- Comprehensive, immutable `audit_logs` tracking every authentication, vendor modification, status change, and invitation

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) v20+ & npm

---

### Method 1: Start All Services via Docker Compose

```bash
# Clone and enter directory
cd baash-growth

# Copy environment variables
cp .env.example .env

# Start all containers (Postgres, Redis, Backend, Frontend)
docker compose up -d

# Check service health
docker compose ps
```

Services will be accessible at:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

### Method 2: Local Development Setup

#### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
cd baash-growth
docker compose up -d postgres redis
```

#### 2. Backend Setup
```bash
cd backend
cp ../.env .env
npm install

# Run database migrations
npx prisma migrate dev

# Seed initial roles, permissions, super admin & demo vendor
npx ts-node src/database/seed.ts

# Start development server
npm run start:dev
```
Backend will be live at `http://localhost:4000/api` (Swagger at `http://localhost:4000/api/docs`).

#### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start Vite development server
npm run dev
```
Frontend will be live at `http://localhost:3000`.

---

## 🔑 Initial Seed Credentials

The database comes pre-seeded with initial accounts for each primary role:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@baash.in` | `BaashAdmin@2026` | Platform Authority (All vendors & settings) |
| **Vendor Admin** | `vendor@acme.com` | `VendorAdmin@2026` | Acme Experience Studio (Tenant Admin) |
| **Vendor Staff** | `staff@acme.com` | `VendorStaff@2026` | Acme Experience Studio (Operational Staff) |

> 💡 **Quick Login**: The login screen includes **1-Click Quick Demo Credentials** buttons to instantly test each role.

---

## 🧪 Running Automated Tests

Run the complete end-to-end integration and tenant isolation test suite:

```bash
cd backend
npm run test:e2e
```

The test suite validates:
1. System health and database connectivity
2. Authentication (login, logout, refresh token rotation, profile extraction)
3. Platform administration (vendor workspace provisioning and monitoring)
4. Role-based access control (preventing vendor accounts from accessing platform admin endpoints)
5. **Strict multi-tenant isolation** (verifying Vendor A cannot view, mutate, or access Vendor B's resources, users, or invitations)
6. Vendor suspension (revoking active user sessions upon workspace suspension)

---

## 💳 Part 3: Credit Wallets, Packages & Razorpay Test Payments

BAASH GROWTH implements a prepaid communication credit architecture:

### 1. Dedicated Channel Wallets
Each vendor workspace maintains three isolated wallets:
- **SMS Wallet**
- **WhatsApp Wallet**
- **Email Wallet**

Each wallet tracks `availableCredits`, `reservedCredits`, `totalPurchased`, `totalConsumed`, and `totalRefunded`. Wallets are initialized with zero balances for newly registered vendors.

### 2. Credit Package Management
- **Admin Configuration**: Create and edit credit packages per communication channel with volume tiers.
- **Dynamic GST Engine**: Automatic calculation of GST rates (default 18%) and final payable amounts using high-precision Decimal arithmetic (preventing floating-point inaccuracies).
- **Default Packages**:
  - *SMS Starter*: 1,000 credits (₹299 + 18% GST = ₹352.82)
  - *SMS Growth*: 5,000 credits (₹1,199 + 18% GST = ₹1,414.82)
  - *WhatsApp Starter*: 500 credits (₹499 + 18% GST = ₹588.82)
  - *WhatsApp Growth*: 2,500 credits (₹1,999 + 18% GST = ₹2,358.82)
  - *Email Starter*: 5,000 credits (₹199 + 18% GST = ₹234.82)
  - *Email Growth*: 25,000 credits (₹799 + 18% GST = ₹942.82)

### 3. Razorpay Integration & Test Simulator
- **Environment Variables**:
  ```bash
  RAZORPAY_KEY_ID=rzp_test_your_key_id
  RAZORPAY_KEY_SECRET=your_razorpay_secret
  RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
  ```
- **Cryptographic Signature Verification**: Validates HMAC SHA256 signatures (`razorpay_order_id|razorpay_payment_id`) on the backend before any credits are allocated.
- **Test Payment Simulator**: When local Razorpay keys are not configured or in sandbox environments, an interactive **TEST PAYMENT SIMULATOR** is provided to simulate authorized payments, cancellations, or signature verification errors without external gateway dependencies.
- **Idempotency Protection**: Unique idempotency keys on every transaction (`purchase_{id}`) ensure network retries and duplicate webhooks never double-credit a vendor.

### 4. Immutable Double-Entry Ledger & Audit Controls
- Every credit balance modification produces an immutable `WalletTransaction` recording `balanceBefore` and `balanceAfter`.
- **Administrative Manual Adjustments**: Super Admins can manually credit or debit vendor wallets with mandatory audit reasons. Negative balances are strictly forbidden by database-level validations.

---

## 📡 Part 4: Real Communication Providers & Campaign Management

BAASH GROWTH Part 4 enables real-world message delivery across three official communication backends with strict multi-tenant isolation, carrier compliance, and wallet reserve/capture cycles.

### 1. Provider Implementations
- **SMS — MSG91 Official API**:
  - Full TRAI DLT compliance (DLT Entity ID, 6-character uppercase Sender ID, Flow Template ID).
  - Indian GSM-7 (160 characters/segment, 153 for concatenated multi-part) and UCS-2/Unicode (70 characters/segment, 67 for concatenated multi-part) credit calculations.
  - Automatic phone number normalization to Indian E.164 (`919876543210`).
- **WhatsApp — Meta WhatsApp Business Cloud API**:
  - Official Graph API `v21.0` (`https://graph.facebook.com/v21.0/{phoneNumberId}/messages`).
  - Pre-approved Meta WhatsApp templates (MARKETING, UTILITY, AUTHENTICATION).
  - Dynamic body variable parameters (`{{1}}`, `{{2}}`).
  - Safe simulation fallback in sandbox mode (`wamid.HBgL...`).
- **Email — Amazon Simple Email Service (SES)**:
  - AWS SigV4 signed REST API dispatch across global AWS regions (e.g. `ap-south-1`).
  - HTML & plain-text content rendering with dynamic variable substitution (`{{name}}`, `{{city}}`).
  - Automated `List-Unsubscribe` header and mandatory footer unsubscribe links.
  - Automatic suppression list writing on permanent bounces and spam complaints.

### 2. Campaign Lifecycle & Wallet Reservation Engine
1. **Audience Screening**: Filters recipients by `CustomerConsent` (strictly excludes `OPTED_OUT`), invalid contact format, and `SuppressionRecord`.
2. **Cost Estimation**: Multiplies eligible recipients by channel segment rate and compares with vendor wallet's `availableCredits`.
3. **Credit Reservation**: Atomically decrements `availableCredits` and increments `reservedCredits` (`TransactionType.CAMPAIGN_RESERVATION`).
4. **Chunked Dispatch**: Dispatches recipients in chunks of 50 to prevent event loop starvation.
5. **Credit Capture & Release**:
   - Dispatched & accepted messages trigger `CAMPAIGN_CAPTURE` (deducts from `reservedCredits` and increments `totalConsumed`).
   - Any unused reserved credits are automatically returned to `availableCredits` via `RESERVATION_RELEASE`.
6. **Cancellation**: Scheduled/queued campaigns can be cancelled with immediate 100% refund of reserved credits.

### 3. Inbound Webhooks
- `POST /api/webhooks/msg91`: Inbound DLR delivery status callbacks.
- `GET /api/webhooks/whatsapp`: Meta webhook hub challenge verification (`hub.challenge`).
- `POST /api/webhooks/whatsapp`: Delivery, read, and failure status updates.
- `POST /api/webhooks/ses`: Amazon SES SNS event ingestion (Deliveries, Bounces, Complaints with automatic suppression).

### 4. Provider Setup & Regulatory Compliance Guide

#### A. MSG91 (SMS - India TRAI DLT Compliance)
1. **DLT Registration**: Register your business on an official Indian DLT portal (e.g. Jio DLT, Vodafone Idea DLT, Airtel DLT).
2. **Sender ID**: Request a 6-character uppercase Sender ID header (e.g. `BAASHG`).
3. **Template Approval**: Register your SMS template text and note the approved DLT Content Template ID.
4. **Platform Setup**: In Admin Console (`/admin/providers`), input your MSG91 Auth Key, Sender ID, and DLT Entity ID.
5. **Webhook Configuration**: Point MSG91 delivery callback to `https://your-domain.com/api/webhooks/msg91`.

#### B. Meta WhatsApp Business Cloud API
1. **Meta Developer App**: Create a business app in Meta for Developers with the WhatsApp product.
2. **System User Token**: Create a System User in Business Manager with permissions: `whatsapp_business_messaging`, `whatsapp_business_management`.
3. **WABA & Phone**: Retrieve your WhatsApp Business Account ID (WABA ID) and Phone Number ID from API Setup.
4. **Webhook Setup**:
   - Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
   - Verify Token: `baash_whatsapp_webhook_verify_token` (matches `META_WEBHOOK_VERIFY_TOKEN`)
   - Subscribed fields: `messages`

#### C. Amazon Simple Email Service (SES)
1. **Domain Verification**: Add DKIM (3 CNAME records), SPF (`v=spf1 include:amazonses.com ~all`), and DMARC TXT records to your DNS.
2. **Sender Identity**: Verify the sender email (e.g. `growth@baash.in`).
3. **Move to Production**: Submit a production access request to AWS to lift the default SES 200 emails/day sandbox restriction.
4. **SNS Bounce/Complaint Notifications**: Create an Amazon SNS topic subscribed to SES bounces and complaints, pointing to HTTP/S webhook: `https://your-domain.com/api/webhooks/ses`.

---

## 📊 Part 5: Final QA, Security, Analytics, Optimization & Deployment

BAASH GROWTH Part 5 establishes production readiness, business intelligence, financial reconciliation, and operational auditability:

### 1. Financial & Wallet Reconciliation Engine
- **Mathematical Audit**: Verifies stored available balances against the double-entry `WalletTransaction` sum ($\sum \text{Credits} - \sum \text{Debits}$).
- **Reservation Health**: Compares active campaign reservations against pending campaigns (`QUEUED`, `PROCESSING`, `SCHEDULED`).
- **Endpoint**: `GET /api/admin/wallets/reconciliation` (Supports single vendor audit via `?vendorId=...`).
- **Interactive UI**: `AdminReconciliationPage` (`/admin/reconciliation`) with variance indicators and health badges.

### 2. Business Intelligence & Reporting Dashboards
- **Admin BI Console** (`/admin/reports`): Real-time metrics for platform revenue, channel revenue distribution, communication gateway costs, net profit margins, and top vendors by dispatch volume.
- **Vendor Campaign Analytics** (`/vendor/analytics`): Dynamic timeframe filtering (`today`, `7d`, `30d`, `this_month`), delivery confirmation metrics, channel breakdown with visual health bars, and CSV export.

### 3. Platform Governance & Security Hardening
- **Settings Console** (`/admin/settings`): Brand identity, system maintenance toggle, session timeouts, rate limits, queue batch sizes, and financial safeguards.
- **Audit Logs** (`/admin/audit-logs`): Real-time searchable log of all authentication, vendor onboarding, balance modifications, and campaign actions with a JSON payload inspector.
- **Readiness Health Probe** (`GET /api/health/ready`): Container & reverse proxy probe validating PostgreSQL connection, latency metrics, and system uptime.

### 4. Technical Documentation Library
Complete operational documentation is organized in `docs/`:
- [System Architecture](docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`): Multi-tenancy, double-entry ledger, provider abstraction.
- [API Reference](docs/API.md) (`docs/API.md`): Complete endpoint catalog with authentication, admin, vendor, and webhook endpoints.
- [Production Deployment](docs/DEPLOYMENT.md) (`docs/DEPLOYMENT.md`): Linux VPS, PM2 cluster, Nginx, Let's Encrypt TLS, zero-downtime deployment script.
- [Provider Setup Manual](docs/PROVIDER_SETUP.md) (`docs/PROVIDER_SETUP.md`): Step-by-step for MSG91 DLT, Meta WhatsApp Cloud API, and Amazon SES.
- [Security Hardening Checklist](docs/SECURITY_CHECKLIST.md) (`docs/SECURITY_CHECKLIST.md`): Verification checklist for RBAC, IDOR defense, and input sanitization.
- [Known Limitations & Roadmap](docs/KNOWN_LIMITATIONS.md) (`docs/KNOWN_LIMITATIONS.md`): Architectural boundaries and scaling roadmap.

---

## 📁 Repository Structure

```
baash-growth/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL models & relations
│   │   └── migrations/            # Version-controlled SQL migrations
│   ├── src/
│   │   ├── admin/                 # Platform administration & vendor lifecycle
│   │   ├── audit/                 # Immutable security audit log service
│   │   ├── auth/                  # JWT auth, refresh rotation, password reset
│   │   ├── common/                # Guards, decorators, filters, interceptors
│   │   ├── database/              # PrismaService & initial seed script
│   │   ├── health/                # System & dependency health monitoring
│   │   ├── users/                 # Vendor staff & team management
│   │   ├── vendors/               # Vendor workspace profile & dashboard
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                      # E2E & tenant isolation test suite
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/                # BAASH brand assets & official logo
│   │   ├── contexts/              # AuthContext & permission helpers
│   │   ├── layouts/               # AdminLayout, VendorLayout, AuthLayout
│   │   ├── pages/
│   │   │   ├── admin/             # AdminOverview, AdminVendors, Placeholders
│   │   │   ├── auth/              # Login, ForgotPassword, ResetPassword, Invite
│   │   │   └── vendor/            # VendorOverview, VendorStaff, VendorSettings
│   │   ├── routes/                # ProtectedRoute & role guards
│   │   ├── services/              # Axios client with auto-refresh
│   │   ├── types/                 # Shared TypeScript models
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── tailwind.config.js         # Exact BAASH color tokens & gradients
│   └── package.json
├── infrastructure/
│   └── nginx/                     # Production reverse proxy config
├── docs/
│   ├── baash-design-system.md     # Extracted brand tokens & guidelines
│   └── architecture.md            # Multi-tenancy & security architecture
├── docker-compose.yml             # Full-stack container orchestration
├── .env.example
└── README.md
```
