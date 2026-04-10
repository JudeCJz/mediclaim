# Mediclaim Institutional Portal
## Formal Technical Documentation Report

**Date Generated:** April 2026  
**Status:** Production-Ready  
**Target Audience:** Senior Developers, DevOps Engineers, College IT Administrators  

---

## 1. PROJECT OVERVIEW

**What the system does**
The Mediclaim Institutional Portal is a specialized Health Insurance (Mediclaim) Enrollment and Archival system. It digitizes the previously manual process of faculty members applying for annual health insurance coverage. It manages institutional premium logic, handles family dependent constraints, and securely stores enrollment data and compliance documents.

**Who uses it (Roles)**
* **Admin (College IT / Finance / HR):** Responsible for initializing "Financial Years" (enrollment cycles), configuring base premiums and tier add-ons, managing staff accounts (bulk CSV imports), monitoring the global registry of claims, broadcasting announcements, and auditing system actions.
* **Faculty (Staff Members):** End-users who log into the portal during an active financial cycle to fill out their family information, select a coverage plan, see a live estimate of their premium deduction, upload supporting compliance documents, and download formal PDF receipts of their enrollment.
* **HOD (Head of Department):** A provisioned role representing departmental approval layers, sharing baseline read-access capabilities but abstracted below core global administrative powers.

**What problem it solves**
It eliminates manual paperwork, prevents erroneous premium calculations by enforcing strict business logic (e.g., maximum dependents allowed), eliminates duplicate submissions via database constraints, and establishes a consolidated, auditable digital record of institutional healthcare liabilities.

**Current Deployment Status and Live URLs**
* **Frontend (Vercel):** `https://mediclaim-chi.vercel.app`
* **Backend API (Render):** `https://mediclaim-backend.onrender.com`
* **Health Check API:** `https://mediclaim-backend.onrender.com/api/health`
* **Database (MongoDB Atlas):** Live Free M0 Cluster

---

## 2. SYSTEM ARCHITECTURE DIAGRAM

```text
+-------------------+       +-----------------------+       +-----------------------+
|  User's Browser   |       |   Vercel (Frontend)   |       |   Render (Backend)    |
|  (React App)      | <---> |   Static Hosting      |       |   Node.js Server      |
|                   |       |   CDN Delivery        |       |   (Express API)       |
+-------------------+       +-----------------------+       +-----------------------+
        |                               ^                               |
        |                               |                               |
        v                               v                               v
+-------------------+       +-----------------------+       +-----------------------+
|  localStorage     |       |   File Storage        |       |   MongoDB Atlas       |
|  (Stores JWT)     |       |   (Temp /uploads)     | <---> |   (Cloud Database)    |
+-------------------+       +-----------------------+       +-----------------------+
```

**Connection Flow:**
1. **Initial Load:** Browser connects to **Vercel** and downloads the Vite-bundled React application.
2. **Authentication:** User inputs credentials. Browser sends POST to **Render**. Render checks credentials against **MongoDB Atlas**. Render signs and returns a **JWT**.
3. **Persisting Session:** Browser stores the JWT in `localStorage`.
4. **Data Operations:** For every subsequent API call to Render, front-end Axios interceptors attach the JWT into the `x-auth-token` HTTP header.
5. **Real-Time:** The browser connects a persistent **Socket.io** WebSocket directly to Render to receive instant broadcasts.
6. **File Storage:** When a user uploads a document, the multipart form is processed by Multer and stored temporarily on Render's ephemeral disk in the `/uploads` folder.

---

## 3. HOSTING INFRASTRUCTURE

### 3.1. Vercel (Frontend)
* **What it hosts:** The compiled static React/Vite application (HTML, CSS, JS).
* **Tier/Plan:** Hobby (Free)
* **URL:** `https://mediclaim-chi.vercel.app`
* **Limitations:** Bandwidth limits apply (100GB/mo). Builds cannot exceed 45 minutes.
* **If it goes down:** The website will fail to load in the browser (DNS error or 503).
* **How to redeploy:** Any push to the `main` branch of the connected GitHub repository automatically triggers a Vercel redeployment.

### 3.2. Render (Backend)
* **What it hosts:** The Node.js Express server, business logic APIs, WebSockets, and temporary file storage.
* **Tier/Plan:** Web Service (Free)
* **URL:** `https://mediclaim-backend.onrender.com`
* **Limitations (Critical):**
  * **Sleep Mode:** The server spins down (sleeps) after 15 minutes of receiving no external web traffic. The next request triggers a "cold start" taking 30-60 seconds.
  * **Ephemeral Storage:** The entire local file system is wiped clean upon every deployment, restart, or sleep cycle. Uploaded files do not persist permanently.
* **If it goes down:** The frontend will load perfectly, but all API calls (login, loading cycles) will fail or hang indefinitely.
* **How to redeploy:** Any push to the `main` branch of the GitHub repository triggers a build.

### 3.3. MongoDB Atlas (Database)
* **What it hosts:** All persistent application data including users, claims, cycles, and audit logs.
* **Tier/Plan:** Shared / M0 Sandbox (Free)
* **URL:** Connection established via `MONGO_URI` backend variable.
* **Limitations:** 512MB storage cap, maximum of 100 simultaneous connections, and restricted operational bandwidth.
* **If it goes down:** The Node.js backend will throw database connection errors. The `/api/health` endpoint will reflect `db: disconnected`.
* **How to redeploy:** The database is continuously hosted. Restoration requires manual imports via MongoDB Compass if not utilizing paid automated backups.

---

## 4. FRONTEND TECHNICAL STACK

| Package | Version | Purpose | Usage |
| :--- | :--- | :--- | :--- |
| **react** | `^19.2.4` | Core UI rendering library. | Fundamental architecture of `/src` |
| **vite** | `^8.0.0` | Development server and production bundler. | Project initialization and build pipeline |
| **axios** | `^1.14.0` | Promise-based HTTP client. | `api.js` (Handles API requests and JWT interceptors) |
| **react-router-dom** | `^7.13.1` | Declarative routing between portal views. | `App.jsx` |
| **socket.io-client** | `^4.8.3` | Real-time WebSocket connectivity. | `AppContext.jsx` (Listens for broadcast updates) |
| **jspdf** | `^4.2.1` | Client-side PDF document generation. | `pdfGenerator.js` (Enrollment receipts) |
| **jspdf-autotable** | `^5.0.7` | Renders precise tables inside jsPDF documents. | `pdfGenerator.js` |
| **lucide-react** | `^0.577.0` | Modern, consistent vector icons. | `Sidebar.jsx` and dynamic UI elements |
| **xlsx** | `^0.18.5` | Excel/CSV parser for bulk parsing operations. | `AdminDashboard.jsx` (Faculty Import) |
| **emailjs-com** | `^3.2.0` | External email service wrapper. | Simulated email dispatches across portal |

---

## 5. BACKEND TECHNICAL STACK

| Package | Version | Purpose | Usage |
| :--- | :--- | :--- | :--- |
| **express** | `^5.2.1` | Node.js web application framework handling HTTP routing. | `index.js`, all `/routes/*` files |
| **mongoose** | `^9.4.1` | Strict object data modeling (ODM) for MongoDB. | `config/db.js`, all `/models/*` files |
| **jsonwebtoken**| `^9.0.3` | Generates and verifies cryptographic session tokens. | `routes/auth.js`, `middleware/auth.js` |
| **bcryptjs** | `^3.0.3` | Password hashing utilizing blowfish cipher (Salted). | `routes/auth.js`, `seed.js` |
| **socket.io** | `^4.8.3` | Server-side WebSocket multiplexer. | `index.js` (Exposed to routes via `req.app.get`) |
| **multer** | `^2.1.1` | Middleware handling `multipart/form-data`. | `routes/claims.js` (Processing Govt IDs) |
| **helmet** | `^8.1.0` | Injects critical security HTTP headers natively. | `index.js` |
| **express-rate-limit**| `^8.3.2` | Throttles high-velocity requests to prevent brute-forcing. | `index.js` (Bound to `/api/auth`) |
| **cors** | `^2.8.6` | Secures cross-origin browser requests globally. | `index.js` |
| **dotenv** | `^17.4.1` | Environment variable loader from `.env`. | System-wide configuration |
| **nodemailer** | `^7.0.5` | Node SMTP mailer for production dispatch arrays. | `routes/mail.js` |

---

## 6. DATABASE SCHEMA

### 6.1 Users Collection
**Collection Name:** `users`
| Field | Type | Required? | Details & Defaults |
| :--- | :--- | :--- | :--- |
| `email` | String | **YES** | **Unique Index**, Lowercased, Trimmed |
| `password` | String | **YES** | Bcrypt hash |
| `name` | String | **YES** | Represents full legal name |
| `department` | String | **YES** | E.g. "CS", "IT", "HR" |
| `empId` | String | **YES** | **Unique Index** |
| `phone` | String | NO | Default `''` |
| `designation` | String | NO | Default `''` |
| `gender` | String | NO | Enum: `['Male', 'Female', 'Other', '']`, Default: `Male` |
| `role` | String | NO | Enum: `['faculty', 'hod', 'admin']`, Default: `faculty` |
| `status` | String | NO | Enum: `['active', 'disabled']`, Default: `active` |
| `createdAt` | Date | NO | Automatically mapped to `Date.now` |

### 6.2 Claims Collection
**Collection Name:** `claims`
| Field | Type | Required? | Details & Defaults |
| :--- | :--- | :--- | :--- |
| `userId` | ObjectId| **YES** | Relational link to the standard User account |
| `email` | String | **YES** | Snapshot of user email |
| `financialYear`| String | **YES** | Text representation of the enrolled cycle |
| `fyId` | String | **YES** | System identity link to the FinancialYear model |
| `policy` | Object | NO | Subschema representing the chosen tier (`id`, `label`, `premium`) |
| `premium` | Number | NO | Computed final premium total. Default: `0` |
| `dependents` | Array | NO | Array containing objects `{ type, name, dob, gender }` |
| `idCard` | String | NO | Filename/URL of Govt ID |
| `photo` | String | NO | Filename/URL of Passport Photo |
| `status` | String | NO | Enum tracking approval pipeline. Default: `submitted` |
**Critical Index:** `claimSchema.index({ userId: 1, fyId: 1 }, { unique: true })`. Enforces that a single User object can NEVER submit two claims per single Financial Year identity.

### 6.3 FinancialYears Collection
**Collection Name:** `financialyears`
| Field | Type | Required? | Details & Defaults |
| :--- | :--- | :--- | :--- |
| `name` | String | **YES** | **Unique Index** (e.g. "AY 2026-2027") |
| `enabled` | Boolean | NO | Default `true`. Controls if it shows in the active dashboard. |
| `lastSubmissionDate`| Date | NO | Soft deadline limit. |
| `maxChildren` | Number | NO | Default `2`. Used directly by UI validation. |
| `spousePremium`| Number | NO | Default `0`. Added to base plan if spouse exists. |
| `childPremium` | Number | NO | Default `0`. Multiplied by child count. |
| `allowSpouse` | Boolean | NO | Default `true` |
| `requireDocuments`| Boolean | NO | Default `false`. If true, block submission without Multer uploads. |
| `policies` | Array | NO | Subschema definitions of base tiers (`id`, `label`, `premium`). |

### 6.4 AuditLogs Collection
**Collection Name:** `auditlogs`
| Field | Type | Required? | Details & Defaults |
| :--- | :--- | :--- | :--- |
| `action` | String | **YES** | **Basic Index** for fast sorting (e.g. `USER_CREATED`) |
| `details` | Mixed | NO | Entire JSON payload capturing the state of the changed data. |
| `actor` | Object | NO | `{ uid, email, role, name }` capturing who triggered the mutation. |

---

## 7. API ENDPOINTS REFERENCE

### `/api/auth`
* `POST /login` - **Auth: None** - Accepts `{ email, password }`. Trims/lowercases email, validates via bcrypt. Returns `{ token, user }`. (Rate-Limited to 20/15m).
* `POST /register` - **Auth: None** - Creates new user in system, generating default hashed password. Returns JWT token.
* `GET /user` - **Auth: User** - Verifies existing JWT header and directly returns full user profile excluding password hash.
* `PUT /update-password` - **Auth: User** - Accepts `{ currentPassword, newPassword }` to rotate user credentials securely.

### `/api/users`
* `GET /` - **Auth: Admin** - Returns an array of all registered users across the system.
* `POST /bulk` - **Auth: Admin** - Accepts bulk arrays mapping CSV files. Iterates over rows and executes an **Upsert** creation, defaulting passwords to the imported email addresses.
* `PUT /:id` - **Auth: Admin/Self** - Updates arbitrary profile data. Admins utilize this to set `status: 'disabled'`.
* `DELETE /:id` - **Auth: Admin** - Purges a user account permanently from the DB.

### `/api/claims`
* `GET /all` - **Auth: Admin** - Returns every claim ever processed across all cycles.
* `GET /my-claims` - **Auth: User** - Identifies user via JWT layer and filters returns to only their historical submissions.
* `POST /` - **Auth: User** - High-complexity route. Accepts `multipart/form-data`. Saves files via Multer. Computes DB injection. Emits `claim_submitted` WebSocket broadcast.
* `PUT /:id` - **Auth: User/Admin** - Amends claim parameters. Admins use this to alter `status` towards 'approved'.
* `DELETE /:id` - **Auth: Admin** - Hard deletion of an enrolled artifact.

### `/api/financialYears`
* `GET /` - **Auth: User** - Returns an array of all cycles to determine enrollment availability.
* `POST /` - **Auth: Admin** - Instantiates a new enrollment session containing all limit variables.
* `PUT /:id` - **Auth: Admin** - Edits limits, dates, or coverage costs of an active session.
* `DELETE /:id` - **Auth: Admin** - Deletes cycle parameters. Safe-guarded manually if claims are already nested inside it via business logic checks.

### `/api/logs` & `/api/mail` & `/api/health`
* `GET /api/logs` - **Auth: Admin** - Exposes raw audit traces for institutional oversight.
* `POST /api/mail/broadcast` - **Auth: Admin** - Iterates over user array and fires HTML configurations through the Nodemailer transport mechanism.
* `GET /api/health` - **Auth: None** - Status ping to verify Render awaken state. Always responds: `{ status: 'ok', db: 'connected/disconnected', timestamp: Date }`.

---

## 8. AUTHENTICATION & SECURITY SYSTEM

**JWT Generation & Storage**
Upon a successful standard login, `jsonwebtoken` creates a payload containing `{ user: { id: user.id, role: user.role } }`. It signs this token securely utilizing the `$JWT_SECRET` string established in the environment variables, attaching an exact `expiresIn: '1d'` boundary. The React client intercepts this successful HTTP return and caches the token immediately into HTML5 `localStorage`.

**JWT Transport & Validation**
An Axios interceptor ensures that every outgoing request from the browser intrinsically inserts `x-auth-token: <Token>` as an HTTP header. 
On the server side, the standard middleware `auth.js` traps the request. It extracts the header, executes `jwt.verify(token, secret)`, and injects the decapitated payload straight into `req.user`. If the token is manually modified or expired, the backend universally halts with a `401 Unauthorized`.

**RBAC (Role-Based Access Control)**
For destructive capabilities (e.g., Deleting a user), a secondary middleware `adminAuth.js` is chained linearly after `auth.js`. It explicitly checks `if (req.user.role !== 'admin')`. If false, it completely stonewalls execution returning `403 Forbidden`. The same paradigm controls HOD elevations.

**State Hardening**
* **Disabled Accounts:** The login controller manually checks `if (user.status === 'disabled')`. If true, the JWT is never generated, neutralizing the account immediately regardless of matching passwords.
* **Rate Limiting:** To prevent algorithmic password cracking, `express-rate-limit` brackets the `/api/auth` endpoint strictly. Any individual IP address is halted after 20 attempts within a 15-minute sliding window.
* **Helmet.js Headers:** Protects against XSS and click-jacking mathematically by injecting rigid CSP and `X-Frame-Options` HTTP headers blindly into every Express envelope.
* **CORS Safety:** Browser cross-origin limitations are strictly mapped to the specific `CLIENT_ORIGIN` variable. Unknown external hosts attempting to fetch the API receive blocked pre-flight failures from the server.
* **NoSQL Injection:** Because Mongoose schemas strictly coerce all `{ "$gt": "" }` payload attacks into literal strings rather than executable parameters, standard injection techniques fail innately.

---

## 9. REAL-TIME SYSTEM (SOCKET.IO)

**Emission Triggers**
To prevent a fragmented experience where an Admin updates a variable but a faculty member is staring at old data, key API endpoints emit signals through the `req.app.get('io')` bridge upon successful Database commits.

**Monitored Events**
* `cycle_updated` - Emitted when an Admin modifies or creates a FinancialYear.
* `claim_submitted` - Emitted when a user finishes enrollment, providing admins an instant dashboard ping.

**Client Subscription**
The `AppContext.jsx` React context establishes a persistent `const socket = io(...)` pipeline utilizing polling/websockets against the backend API URL across mount. It sets up `.on('cycle_updated', () => fetchData())` listeners. Therefore, when an admin changes a cycle, the active faculty screen inherently refetches the raw database cycle endpoint implicitly without human page interaction.

---

## 10. ENROLLMENT BUSINESS LOGIC

**Cycle Logic**
A faculty member dashboard iterates through the `FinancialYears` DB list. Any cycle that matches `isEnabled === true`, is not archived, and hasn't violated the soft date condition `new Date() < lastSubmissionDate` renders as an active "Card" ready for interactions.

**Premium Math**
The system computes real-time math exclusively out of the parameters set by the admin per cycle.
Formally: `Base Plan Select + (Spouse boolean ? cycle_spousePremium : 0) + (Children Count * cycle_childPremium) + (Parent Count * cycle_parentPremium)`.
*Note: This mathematical mapping occurs natively in React hooks leveraging `Number()` casts to overcome input string corruption, and is repeated redundantly by the POST handler inside the backend.*

**Validation Pipeline**
Before an `onSubmit` executes, the UI asserts a heavy checklist: It ensures all profile strings (Employee IDs, DoJ) are filled natively, evaluates document upload requirements derived from the cycle constraints, handles arrays dynamically confirming a dependent `type: "spouse"` only appears internally once if `allow_spouse` is engaged.

**Deduplication**
A composite MongoDB index mathematically forbids duplicate overlapping data. If user `XYZ` double-clicks the "Submit" button rapidly over a localized 20ms jitter latency window, the database throws an `E11000 duplicate key error` on the combination of `[userId + fyId]`, shielding the institutional ledger against duplicate claims cleanly.

---

## 11. FILE UPLOAD SYSTEM

**Adapter and Storage**
When a Financial Year demands documentation (Require Documents = true), React generates a `multipart/form-data` payload containing raw binary images. The Express route intercepts it using the `multer` middleware. The stream is written dynamically into the relative disk directory `UPLOADS_DIR` defined in `.env` (typically `./uploads`), tagged with an anti-collision timestamp modifier. The filepath is appended to the `Claim` document dynamically before saving.

**Static Rendering**
The Node.js server explicitly routes front-end retrieval requests via `express.static(uploadsDir)`, rendering objects identically over the internet (e.g. `/uploads/file123.jpg`).

**The Ephemeral Limitation (CRITICAL)**
Render's free tier functions strictly as a virtual ephemeral container. The moment the server sleeps (after 15 minutes), or builds a new deployment, the virtual disk purges. Thus, **all Government IDs stored in `/uploads` are completely lost permanently**.
*Recommended Action:* Shift `multer` engine bindings from `multer.diskStorage` over to `multer-storage-cloudinary`, routing the binary streams perfectly outwards to a free tier Cloudinary API asset bucket ensuring long-term institutional survival.

---

## 12. PDF RECEIPT GENERATION

**Engine Mechanics**
PDF Generation is an exclusively client-side affair utilizing the `jsPDF` package. The backend Express API does zero heavy document rastering—saving total architectural overhead and guaranteeing snappy delivery times.

**Data Flow**
When a faculty user clicks the "Download PDF" button available immediately on the active session modal or via the historic archives route, the localized React context passes the raw MongoDB `Claim` object JSON footprint specifically over into `pdfGenerator.js`. The engine maps out `doc.text()` operations rendering institutional headers, dependent tables via `jspdf-autotable`, computed financial liabilities, and unique Tracking IDs cleanly as an institutional grade buffer document triggered natively back into the browser's local downloading stream.

---

## 13. ENVIRONMENT VARIABLES REFERENCE

### `server/.env` (Backend / Render)
| Variable | End | Purpose | Example / Required? |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | Specific Node HTTP port listening limit. | `5000` (Required) |
| `MONGO_URI`| Backend | Exact MongoDB Atlas connection routing address. | `mongodb+srv://user:pass@cluster.mongodb.net/mediclaim` (Required) |
| `JWT_SECRET`| Backend | Salt payload utilized to guarantee token immutability. | `xK9#mP2$nQ7@...` (Required) |
| `CLIENT_ORIGIN`| Backend| Used by CORS to restrict execution outside trusted links. | `https://mediclaim-chi.vercel.app` (Required) |
| `PUBLIC_SERVER_URL`| Backend| Internal URL bridging static file pathing dynamically. | `https://mediclaim-backend.onrender.com` (Required) |
| `UPLOADS_DIR`| Backend | Filepath target for local image persisting. | `./uploads` (Optional) |

### `/.env` (Frontend / Vercel)
| Variable | End | Purpose | Example / Required? |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Frontend| Bridges the Axios intercepts directly across the gap to the Render URL block. | `https://mediclaim-backend.onrender.com/api` (Required: MUST NOT END IN TRAILING SLASH) |

---

## 14. DEPLOYMENT PROCEDURE

**Redeploying Frontend (Vercel)**
Because the project runs tightly integrated against a GitHub master repository, deploying Frontend updates requires simply running a standard Git commit flow.
`git add .` -> `git commit -m "UI Updates"` -> `git push origin main`.
Vercel's automated git-hooks instantly consume the event, build Vite, and redeploy over CDN silently in roughly ~2 minutes.

**Redeploying Backend (Render)**
Exactly identical mechanism to the frontend. Pushing to `origin main` automatically queues a Render Docker build flow deploying Node seamlessly.

**Re-seeding the Database**
In circumstances where core users vanish or an API migration initializes cleanly:
Navigate into the Render Portal dashboard -> Click on `mediclaim-backend` -> Navigate to the active `Shell` tab.
Execute explicitly: `node seed.js`. 
Because it uses MongoDB `UPSERT` capabilities, it guarantees safe execution guaranteeing Admin and Faculty accounts natively overwrite without dangerous duplication warnings.

**Rotating JWT Secrets**
In circumstances concerning massive data compromise or scheduled institutional rotation policy: Navigate to the Render Environment list and alter the `JWT_SECRET` variable entirely randomly. Deploy. It forcefully revokes all stored global session cookies forcing immediate enterprise-wide re-authentications.

---

## 15. KNOWN LIMITATIONS & RECOMMENDED FIXES

### Render Free Tier Cold Starts
* **Impact:** High. Front-line users trying to login in the morning face extreme 40+ second infinite loading screen delays while the backend Docker spins up.
* **Fix:** Elevate Render API container structure directly into the first paid layer (+~$7/mo).
* **Effort:** Low (Click button inside Render dashboard interface).

### Ephemeral File Storage Purges
* **Impact:** Extreme. Core compliance documents systematically disappear permanently into the void when Render shuts down roughly 4 times globally a day.
* **Fix:** Embed a persistent S3 protocol alternative like `Cloudinary` natively inside the `Multer` Express routes.
* **Effort:** Medium/High (Requires external Cloudinary API initialization and core controller rewirings inside `/claims`).

### Lack of Formal SMTP Configuration
* **Impact:** Low. All email behavior in the portal executes artificially, bypassing actual dispatch to user inboxes securely.
* **Fix:** Inject correct formal institution SMTP strings natively inside the NodeJS `nodemailer` configurations inside `/mail` routes and clear testing limitations.
* **Effort:** Low (Pure config updates mapping variables).

### Database Snapshots
* **Impact:** High. Free tier Mongo arrays do not automate snapshot instances explicitly across destructive timeline points natively.
* **Fix:** Bind the MongoDB cluster directly to a custom execution script routing internal `mongoexport` instances globally or upgrade to paid institutional tiers mapping automations explicitly natively.
* **Effort:** Low (Pure dashboard management).

---

## 16. DEFAULT CREDENTIALS & FIRST LOGIN INSTRUCTIONS

The system is deployed globally utilizing standard test matrices defined heavily inside the `seed.js` parameters:

**System Administrator Capabilities**
* **Username:** `admin@college.edu`
* **Password:** `admin123`

**Standard Faculty Sandbox Access**
* **Username:** `faculty@college.edu`
* **Password:** `faculty123`

**Critical Security Instructions On First Production Load**
1. An IT authority must login globally inside the Admin framework utilizing the credentials established above.
2. Navigate precisely to the sidebar `Settings` interface -> Execute `Secure Profile`.
3. Shift the system entirely away from `admin123` globally utilizing the institutional grade secure password rotation policy interfaces directly mapping out of Node API validations.

*(Note: Never accidentally cycle the JWT variables inside the Render core unless absolutely forced directly regarding systematic data breaches.)*

---

## 17. GLOSSARY

* **JWT (JSON Web Token):** A secure, randomized digital "wristband". When you prove who you are (login), the server gives you a wristband. You show the wristband for all following requests, so you never have to send your password twice.
* **MongoDB / Atlas:** A highly versatile modern database platform. Instead of storing data in rigid rows and columns (SQL), it stores complete documents dynamically. Atlas is the cloud version of this system.
* **REST API:** The formal communication standard indicating exactly how the React application is allowed to "talk" to the Node.js server over the internet (via GET, POST, or DELETE requests).
* **Socket.io:** A real-time engine. Usually, a website has to "refresh" to see if data changed. Sockets hold an open, live connection and instantly push changes specifically to the screen.
* **Vercel / Render:** "Serverless" cloud hosting companies. They take raw source code from a GitHub repository and automatically distribute it safely across globally secure internet servers natively.
* **Middleware:** Programmable "checkpoints" in the backend. Before a request can reach the database, it must pass middlewares (e.g. "Does this user have a valid JWT?", "Is this an Admin?").
* **CORS (Cross-Origin Resource Sharing):** A security rule inside browsers confirming external unauthorized websites are intentionally completely banned from secretly communicating with the institutional backend application structure directly maliciously.
* **Rate Limiting:** A defensive barrier throttling high speed inputs (blocks an attacker trying exactly 10,000 passwords globally repeatedly rapidly stopping at 20 max explicitly).
* **Mongoose:** A powerful Javascript translator allowing modern code definitions safely natively executed securely inside raw MongoDB querying languages structurally overriding classic injections defensively. 
* **Vite:** A specialized execution assembly engine directly packing native multi-fragment React UI architectures instantly down structurally into safe raw highly compressed Javascript explicitly designed natively to operate quickly mathematically for browsers specifically safely.
* **PM2:** An optional institutional production engine fundamentally overriding system level execution faults globally instantly restarting server containers structurally if crashes occur dynamically. (Currently substituted natively correctly by Render).

---
**End of Document**
