# BAASH GROWTH — Known Architectural Limitations & Scaling Roadmap

This document outlines the current architectural boundaries of the BAASH GROWTH MVP release, along with recommended upgrade paths for high-volume enterprise scaling.

---

## 1. Current Architectural Boundaries

### 1.1 In-Process Campaign Queue Worker
- **Current Behavior**: Campaign batching and provider dispatch run as an asynchronous in-process queue worker within the NestJS application instance.
- **Limitation**: If the server undergoes an unexpected restart or PM2 crash while a 20,000-recipient campaign is actively dispatching, recipients in flight remain in `PENDING` status. The admin/vendor must re-trigger or cancel the remaining batch.
- **Scaling Recommendation**: For volumes exceeding 100,000 messages/hour, migrate the campaign dispatcher to **BullMQ** backed by a Redis cluster with persistent job retry queues and dead-letter queues (DLQ).

### 1.2 External Provider Approvals & Sandboxes
- **MSG91 (SMS)**: Indian Telecom DLT entity registration, header registration, and template approvals take 3–7 business days to be approved by telecom operators. Until DLT IDs are linked, messages are safely simulated.
- **Meta WhatsApp Cloud API**: Unverified Meta Business Manager accounts are restricted to 250 business-initiated conversations in a rolling 24-hour window. Full tier scaling (1K $\rightarrow$ 10K $\rightarrow$ 100K $\rightarrow$ Unlimited) requires completing Meta Business Verification and maintaining a high phone number quality rating.
- **Amazon SES (Email)**: Newly created AWS accounts operate in the SES Sandbox (200 emails per 24 hours at 1 email/sec, sending only to verified email addresses). Production access must be requested via AWS Support with justification of bounce handling policies.
- **Razorpay**: Configured by default in Test mode. Switching to Live requires generating Live API keys and completing merchant KYC on the Razorpay dashboard.

### 1.3 Database Architecture (Single Primary Node)
- **Current Behavior**: The system uses a single PostgreSQL primary instance accessed via Prisma ORM connection pooling.
- **Limitation**: While optimal for up to 500 active vendors and millions of customer rows, read-heavy analytical dashboards under peak load share database I/O with transactional campaign dispatching.
- **Scaling Recommendation**: Introduce **PgBouncer** connection pooling and configure read replicas for analytical queries (`AdminReportsPage`, `VendorAnalyticsPage`).

### 1.4 Webhook Delivery Polling
- **Current Behavior**: Frontend interfaces update campaign delivery progress bars and recipient statuses upon page navigation or automated TanStack Query polling intervals (5–10 seconds).
- **Limitation**: Does not push individual recipient status updates via bi-directional WebSockets.
- **Scaling Recommendation**: Integrate a Socket.io / WebSocket gateway in NestJS for live event streaming to active campaign screens.

---

## 2. Release Status Classification

| Module | Classification | Verification Status |
| :--- | :--- | :--- |
| **Authentication & RBAC** | **Production Ready** | 100% verified (Bcrypt, JWT rotation, HttpOnly cookies) |
| **Multi-Tenant Isolation** | **Production Ready** | 100% verified (TenantGuard, cross-tenant IDOR defense) |
| **Customer CRM & CSV Import** | **Production Ready** | 100% verified (E.164 sanitization, tag/segment rules) |
| **Templates & Dynamic Variables** | **Production Ready** | 100% verified (Placeholders, HTML sanitization against XSS) |
| **Credit Wallets & Ledger** | **Production Ready** | 100% verified (Double-entry, reservations, reconciliation engine) |
| **Razorpay Payments** | **Controlled Pilot Ready** | Test-mode functional; requires live credentials for production |
| **MSG91 SMS Gateway** | **Controlled Pilot Ready** | Real integration implemented; requires vendor DLT IDs |
| **Meta WhatsApp API** | **Controlled Pilot Ready** | Cloud API integrated; requires Meta Business Verification |
| **Amazon SES Email** | **Controlled Pilot Ready** | SES integrated; requires AWS sandbox removal |
| **Analytics & Business Intelligence** | **Production Ready** | 100% database-backed, real-time date filtering |
| **Overall Platform** | **Controlled Pilot Ready** | Ready for vendor pilot onboarding and controlled commercial rollout |
