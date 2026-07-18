# CityCare — Retail Pharmacy Management (MERN)

A full-stack web app to run a single-location retail pharmacy / medical store in India:
inventory with batch + expiry tracking, fast GST billing/POS, sales returns, customer
khata (credit), Schedule H1 register, prescriptions, reports and a dashboard — with
role-based access and an audit trail.

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, React Query, React Router
- **Backend:** Node.js + Express + TypeScript, REST API
- **Database:** MongoDB + Mongoose (multi-document transactions for atomic billing)
- **Auth:** JWT access + refresh tokens, bcrypt, roles (Admin / Pharmacist / Cashier)
- **PDF/Excel:** server-side invoice PDF (PDFKit) + report export (ExcelJS / PDFKit)

---

## Quick start (zero-install database)

You need **Node.js 18+** only. The dev setup runs an **in-memory MongoDB replica set**
automatically (downloads a MongoDB binary on first run — needs internet once), so you do
not have to install MongoDB to try the app.

```bash
# from the project root
npm run install:all          # installs root, server and client deps

# create env files
copy server\.env.example server\.env      # Windows  (cp on macOS/Linux)
copy client\.env.example client\.env

# start both server (:5000) and client (:5173)
npm run dev
```

Then open **http://localhost:5173**.

`server/.env` ships with `USE_MEMORY_DB=true`, which boots the in-memory replica set and
**auto-seeds demo data** (medicines, batches, suppliers, doctors, users) on first start.

### Demo logins

| Role       | Email                        | Password   | Access                              |
|------------|------------------------------|------------|-------------------------------------|
| Admin      | admin@pharmacy.local         | Admin@123  | Everything                          |
| Pharmacist | pharmacist@pharmacy.local    | Staff@123  | Billing + stock + register + reports |
| Cashier    | cashier@pharmacy.local       | Staff@123  | Billing only                        |

---

## Running against a real MongoDB

Transactions (atomic billing) require a **replica set**. Two easy options:

**A. MongoDB Atlas** (replica set by default) — set in `server/.env`:
```
USE_MEMORY_DB=false
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/pharmacy?retryWrites=true&w=majority
```

**B. Local single-node replica set:**
```bash
mongod --replSet rs0 --dbpath /data/db
# once, in mongosh:
rs.initiate()
```
Then in `server/.env`:
```
USE_MEMORY_DB=false
MONGODB_URI=mongodb://localhost:27017/pharmacy?replicaSet=rs0
```

Seed demo data into a real DB:
```bash
npm run seed            # = npm --prefix server run seed
```

> The server detects at startup whether transactions are available and logs
> `transactions ENABLED` / `NOT available`. Always deploy against a replica set so
> billing and GRN are truly atomic.

---

## Environment variables

### `server/.env`
| Var | Description |
|-----|-------------|
| `PORT` | API port (default 5000) |
| `CLIENT_ORIGIN` | Allowed CORS origin (default http://localhost:5173) |
| `USE_MEMORY_DB` | `true` = in-memory replica set + auto-seed; `false` = use `MONGODB_URI` |
| `MONGODB_URI` | Mongo connection string (replica set required for transactions) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Token lifetimes (e.g. `15m`, `7d`) |
| `UPLOAD_DIR` | Folder for uploaded prescription images (default `uploads`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Admin created by the seed script |

### `client/.env`
| Var | Description |
|-----|-------------|
| `VITE_API_URL` | API base URL. Leave **empty** to use the Vite dev proxy (recommended locally). |

---

## Scripts

Root:
- `npm run dev` — run server + client together
- `npm run install:all` — install all dependencies
- `npm run seed` — seed demo data (real DB)

Server (`/server`):
- `npm run dev` — start API with hot reload (tsx)
- `npm run build` / `npm start` — compile to `dist` and run
- `npm run seed` — seed demo data
- `npm run typecheck`

Client (`/client`):
- `npm run dev` — Vite dev server
- `npm run build` / `npm run preview`
- `npm run typecheck`

---

## Features

**Inventory** — medicine master (schedule, HSN, GST %, pack, barcode, reorder level, rack),
batch-level stock with expiry/MRP/rates, purchase entry (GRN) with auto stock-in,
suppliers, stock adjustments (damage/expiry/correction), low-stock / near-expiry / expired
alerts, stock valuation.

**Billing / POS** — keyboard-driven, barcode/name search, **FEFO** batch auto-selection,
line + bill discounts, automatic CGST/SGST split, cash/card/UPI/credit payments, hold &
recall bills, GST-compliant invoice PDF (store details, drug licence no, GSTIN, batch +
expiry per line, tax breakup). **Billing is an atomic MongoDB transaction** — stock is
never oversold and expired stock is blocked.

**Returns & credit** — sales return against an invoice (restores batch stock), customer
master + khata ledger with payments.

**Compliance** — prescription image upload linked to a sale, auto-maintained **Schedule H1
register** (filterable + Excel/PDF export), doctor master.

**Reports & dashboard** — today's KPIs and payment split; sales, GST summary (GSTR-1),
purchase register, profit margin, expiry, fast/slow movers, per-item stock ledger — each
exportable to Excel and PDF.

**Admin** — role-based access (Admin/Pharmacist/Cashier), audit trail on sensitive actions,
store settings (identity, drug licence, GSTIN, invoice numbering, near-expiry window, tax).

### Keyboard shortcuts (Billing)
`F1` focus search · `↑/↓` navigate results · `Enter` add item · `F2` pay & save ·
`F4` new/clear bill · `Esc` close dropdown/modal.

---

## Project structure

```
/server   Express + Mongoose API (models, controllers, routes, services, validators, seed)
/client   React + Vite SPA (pages, components, lib)
```

### Notable design choices
- `purchases` and `sales` **embed** their `items[]`; `batches`, `customers`, `doctors`,
  `medicines` are **referenced** (shared, independently updated). Indexes on medicine name
  (text) + barcode, `batches.medicineId`/`expiry`, `sales.createdAt`, `scheduleH1.date`.
- Sale rates are **GST-inclusive** (Indian retail MRP style); the server computes the
  taxable value and CGST/SGST split per line and distributes bill-level discount
  proportionally so the GSTR-1 summary stays correct.
- Every endpoint validates input with **zod**; errors use a consistent
  `{ error: { message, details? } }` shape.
- The UI is fully responsive (tables reflow to cards on mobile, ≥44px touch targets,
  collapsible nav) and respects `prefers-reduced-motion`.

### Note on shadcn/ui
The UI uses Tailwind with a small set of hand-written shadcn-style primitives
(`client/src/components/ui.tsx`) instead of running the shadcn CLI, so the project is
self-contained and installs without an interactive generator step. The look and tokens
(neutral surfaces, single teal accent, amber/red reserved for warnings/errors) follow the
shadcn aesthetic.
```
