# BAASH GROWTH — API Reference Specification

Base URL: `http://localhost:4000/api` (Development) / `https://growth.baash.in/api` (Production)
Interactive Swagger Documentation: `http://localhost:4000/api/docs`

---

## 1. Authentication & Session Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user credentials, sets HTTP-only refresh cookie, returns access token. |
| `POST` | `/api/auth/refresh` | Public | Exchanges HTTP-only refresh token cookie for a rotated access token. |
| `POST` | `/api/auth/logout` | Authenticated | Clears refresh cookie and terminates active user session. |
| `GET` | `/api/auth/me` | Authenticated | Returns current profile, role, vendor identity, and permissions. |
| `POST` | `/api/auth/forgot-password` | Public | Generates password reset token and dispatches reset instructions. |
| `POST` | `/api/auth/reset-password` | Public | Validates reset token and sets new password. |

---

## 2. System Health & Infrastructure (`/api/health`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Liveness probe returning overall service status and database state. |
| `GET` | `/api/health/ready` | Public | Readiness probe checking PostgreSQL connectivity, uptime, and database latency. |

---

## 3. Super Admin Platform Console (`/api/admin`)

*Requires role: `SUPER_ADMIN`*

### 3.1 Vendor Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/vendors` | Paginated listing of all registered tenant workspaces. |
| `POST` | `/api/admin/vendors` | Provisions new vendor business workspace and creates initial vendor admin. |
| `GET` | `/api/admin/vendors/:id` | Returns complete vendor profile, team members, and wallet balances. |
| `PATCH` | `/api/admin/vendors/:id/status` | Suspends, activates, or locks vendor workspace access. |

### 3.2 Communication Providers & Channel Pricing
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/providers` | Lists provider configurations (MSG91, Meta WhatsApp, Amazon SES) with masked keys. |
| `POST` | `/api/admin/providers` | Updates provider credentials and activation flags. |
| `POST` | `/api/admin/providers/test-connection` | Sends diagnostic ping to verify provider credentials before activation. |
| `GET` | `/api/admin/pricing` | Lists base vendor credit price per SMS, WhatsApp message, and Email. |
| `PUT` | `/api/admin/pricing/:channel` | Updates credit rate per unit for a given communication channel. |

### 3.3 Credit Packages & Financial Reconciliation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/packages` | Lists credit top-up packages available for purchase. |
| `POST` | `/api/admin/packages` | Creates new credit package with volume discounts. |
| `PATCH` | `/api/admin/packages/:id` | Modifies credit package pricing, credits, or active status. |
| `GET` | `/api/admin/wallets` | Lists all vendor wallet balances across SMS, WhatsApp, and Email. |
| `POST` | `/api/admin/wallets/manual-grant` | Issues manual credit adjustment with mandatory audit explanation. |
| `GET` | `/api/admin/wallets/reconciliation` | Audits stored balances against ledger transactions and campaign reservations. |

### 3.4 Business Intelligence & Audit Trail
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/metrics` | Platform overview, revenue, gateway costs, margins, and top vendors. |
| `GET` | `/api/admin/audit-logs` | Immutable audit trail of platform events, actor details, and IP addresses. |

---

## 4. Vendor Workspace APIs (`/api/vendor`)

*Requires role: `VENDOR_ADMIN` or `VENDOR_STAFF` with tenant context*

### 4.1 Customer CRM & Segmentation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vendor/customers` | Search, filter, and paginate vendor customer records. |
| `POST` | `/api/vendor/customers` | Adds a single customer to vendor database. |
| `GET` | `/api/vendor/customers/:id` | Customer details, communication history, and consent status. |
| `PATCH` | `/api/vendor/customers/:id` | Updates customer contact info, tags, and consent preferences. |
| `DELETE` | `/api/vendor/customers/:id` | Deletes customer record. |
| `POST` | `/api/vendor/customers/bulk-delete` | Deletes multiple customer IDs in a single transaction. |
| `POST` | `/api/vendor/customers/bulk-tags` | Assigns or removes tags across selected customer IDs. |
| `POST` | `/api/vendor/customers/import` | Uploads and processes CSV file with field mapping. |
| `GET` | `/api/vendor/segments` | Lists dynamic audience segments. |
| `POST` | `/api/vendor/segments` | Creates new rule-based dynamic customer segment. |

### 4.2 Communication Templates
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vendor/templates` | Lists vendor message templates across SMS, WhatsApp, and Email. |
| `POST` | `/api/vendor/templates` | Creates message template with dynamic placeholders (`{{name}}`). |
| `PATCH` | `/api/vendor/templates/:id` | Edits template content or external DLT/Meta registration ID. |

### 4.3 Wallets, Packages & Payments
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vendor/wallets` | Returns vendor's SMS, WhatsApp, and Email available and reserved credits. |
| `POST` | `/api/vendor/wallets/orders` | Initiates Razorpay test order for selected credit package. |
| `POST` | `/api/vendor/wallets/orders/verify` | Verifies Razorpay payment signature and credits the vendor wallet. |
| `GET` | `/api/vendor/transactions` | Paginated double-entry ledger history of all credits and debits. |

### 4.4 Campaigns & Performance Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vendor/campaigns` | Lists vendor campaigns with status and delivery counts. |
| `POST` | `/api/vendor/campaigns` | Creates and dispatches or schedules a campaign (reserves credits). |
| `GET` | `/api/vendor/campaigns/:id` | Detailed campaign report, delivery metrics, and recipient logs. |
| `POST` | `/api/vendor/campaigns/estimate` | Validates audience size, checks suppression list, and estimates credits. |
| `POST` | `/api/vendor/campaigns/:id/cancel` | Cancels scheduled campaign and releases reserved credits. |
| `GET` | `/api/vendor/analytics` | Aggregated delivery rates, channel metrics, and date filtering (`?timeframe=30d`). |

---

## 5. Public Webhooks (`/api/webhooks`)

*Public endpoints secured via secret headers or provider signatures*

| Method | Endpoint | Provider | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/webhooks/sms/msg91` | MSG91 | Ingests real-time SMS DLR delivery updates. |
| `GET` | `/api/webhooks/whatsapp` | Meta | Verifies webhook challenge during Meta webhook verification. |
| `POST` | `/api/webhooks/whatsapp` | Meta | Ingests WhatsApp sent, delivered, read, and failed statuses. |
| `POST` | `/api/webhooks/email/ses` | Amazon SES | Ingests SNS email notifications (Delivery, Bounce, Complaint). |
| `POST` | `/api/webhooks/razorpay` | Razorpay | Ingests `payment.captured` events for automated order fulfillment. |
