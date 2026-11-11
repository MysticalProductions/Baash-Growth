# BAASH GROWTH — Production Security & Hardening Checklist

This security checklist must be verified prior to onboarding commercial vendors and promoting BAASH GROWTH to public production.

---

## 1. Authentication & Session Security

- [x] **Password Hashing**: Passwords hashed using Bcrypt with 12 salt rounds; plain text passwords never stored or logged.
- [x] **Access Token Lifecycle**: JWT access tokens expire in 15 minutes (`JWT_EXPIRATION=15m`).
- [x] **Refresh Token Rotation**: Refresh tokens are single-use; each refresh request issues a new token and revokes the previous token.
- [x] **Cookie Security**: Refresh tokens stored exclusively in `HttpOnly`, `SameSite=Strict`, `Secure` (in production) cookies, completely inaccessible to JavaScript.
- [x] **Brute-Force Protection**: Login endpoints implement progressive backoff and failed attempt throttling.
- [x] **Super Admin Privilege Separation**: Platform administration endpoints require explicit `SUPER_ADMIN` role; vendor users cannot access `/api/admin/*`.

---

## 2. Multi-Tenant Isolation & IDOR Defense

- [x] **Context Derivation**: Tenant context is derived strictly from the verified JWT payload (`@CurrentTenant()`), never from client input.
- [x] **Query Scoping**: Every database query on vendor resources includes `WHERE vendor_id = :currentVendorId`.
- [x] **Cross-Tenant IDOR Testing**: Verified via automated E2E tests (`part5-final-qa.e2e-spec.ts`); attempting to read or modify another vendor's customer or campaign returns `404 Not Found` or `403 Forbidden`.
- [x] **Cascade Deletion Boundaries**: Deleting a vendor cleanly cascades only that vendor's child records without affecting sibling tenants.

---

## 3. Data Protection, Injection & XSS Defense

- [x] **SQL Injection Defense**: 100% of database interactions run through Prisma ORM parameterized queries; raw string interpolation in SQL is strictly disallowed.
- [x] **Cross-Site Scripting (XSS)**: Email templates with dynamic customer merge tags (`{{firstName}}`, etc.) are HTML-escaped before dispatch to prevent stored XSS attacks.
- [x] **Input Validation**: All incoming requests are validated against strict class-validator DTOs with `whitelist: true` and `forbidNonWhitelisted: true`.
- [x] **CSV Upload Sanitization**: Customer CSV imports validate file MIME types, sanitize field contents, and validate phone numbers against E.164 formats before insertion.
- [x] **Suppression List Compliance**: Hard bounces and opt-outs are immediately added to `suppression_records` to prevent unsolicited messaging.

---

## 4. Financial Integrity & Ledger Protection

- [x] **Prepaid Wallet Invariant**: Balance checks occur before campaign dispatch; unsufficient funds immediately halt dispatch.
- [x] **Credit Reservation Protocol**: Credits are reserved (`available -= cost`, `reserved += cost`) upon queuing, preventing race conditions or double-spending across concurrent campaigns.
- [x] **Double-Entry Ledger**: Every balance mutation produces an immutable record in `wallet_transactions`. Direct updates to wallet balances without ledger entries are prohibited.
- [x] **Automated Reconciliation**: Admin reconciliation engine (`/api/admin/wallets/reconciliation`) mathematically verifies that stored wallet balances match ledger sums.

---

## 5. Gateway Credentials & Webhook Verification

- [x] **Credential Masking**: Provider configuration endpoints mask API secrets (e.g., `••••••••abcd`) so credentials cannot be scraped from admin dashboards.
- [x] **Environment Separation**: Sensitive secrets are stored in `.env` files; `.env` is committed to `.gitignore`.
- [x] **Webhook Signature Verification**:
  - Razorpay webhooks verify HMAC-SHA256 signatures.
  - Meta WhatsApp webhooks verify SHA-256 Hub signatures.
  - Amazon SES webhooks verify SNS certificate signatures.
- [x] **Webhook Idempotency**: Webhook events are logged with unique provider message IDs to ensure duplicate deliveries are safely ignored.

---

## 6. Network & Operating System Hardening

- [x] **CORS Configuration**: CORS restricts allowed origins to the configured `FRONTEND_URL` (`growth.baash.in`).
- [x] **HTTP Security Headers**: Nginx enforces `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, and `Referrer-Policy`.
- [x] **TLS Encryption**: Strict TLS 1.2/1.3 with automated certificate renewal via Certbot.
- [x] **Health Probes**: Liveness (`/api/health`) and readiness (`/api/health/ready`) probes monitor PostgreSQL latency without revealing internal stack traces.
