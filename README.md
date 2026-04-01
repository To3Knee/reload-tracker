<p align="center">
  <img src="src/assets/logo.png" alt="Reload Tracker" width="220">
</p>

<h1 align="center">Reload Tracker</h1>

<p align="center">
  <strong>Professional inventory, cost management, and ballistics logging for handloaders.</strong><br>
  Multi-user · PWA · Offline-capable · Precision decimal math
</p>

<p align="center">
  <a href="https://demo.reloadtracker.com">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-demo.reloadtracker.com-00C7B7?style=for-the-badge&logo=netlify&logoColor=white">
  </a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-20232a?logo=react&logoColor=61DAFB">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white">
  <img alt="Postgres" src="https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white">
  <img alt="Netlify" src="https://img.shields.io/badge/Netlify-000000?logo=netlify&logoColor=00C7B7">
  <img alt="iOS" src="https://img.shields.io/badge/iOS-000000?logo=apple&logoColor=white">
  <img alt="Android" src="https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white">
</p>

---

> **Safety & Responsibility**
> Reload Tracker is a **data management tool only**. Always verify load data against published manuals. Reload at your own risk and follow all local laws.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/calculator.png" alt="Live Round Calculator" width="900">
  <br><em>Live Round Calculator — real-time per-round cost with component breakdown and factory ammo ROI comparison</em>
</p>

<p align="center">
  <img src="docs/screenshots/recipes.png" alt="Recipes" width="900">
  <br><em>Recipes — full load definitions with cartridge visualizer, ballistic stability gauge, and ingredient lots</em>
</p>

<p align="center">
  <img src="docs/screenshots/range.png" alt="Range Logs" width="900">
  <br><em>Range Logs — digital shooting journal with MOA calc, SD/ES tracking, target photos, and PDF binder export</em>
</p>

<p align="center">
  <img src="docs/screenshots/armory.png" alt="Armory" width="900">
  <br><em>Armory — firearms roster with gear locker, round counts, and spec tracking</em>
</p>

<p align="center">
  <img src="docs/screenshots/analytics.png" alt="Analytics" width="900">
  <br><em>Analytics — cost trends, velocity consistency charts, and component spend breakdown</em>
</p>

<p align="center">
  <img src="docs/screenshots/mobile.png" alt="Mobile PWA" width="380">
  <br><em>Installable PWA — full offline support, pull-to-refresh, and haptic feedback on iOS and Android</em>
</p>

---

## Why Reload Tracker?

Reloading costs are easy to lose track of:

- Powder by the pound or kilo, charged by the grain
- Bullets by the thousand, priced per hundred
- Primers in sleeves, cases in bulk
- Shipping, HazMat fees, and tax on top of everything

Reload Tracker turns all of that into **exact per-round math** with a fast, mobile-first UI:

- No more "I think my 9mm is around 20¢?" — know it to four decimal places
- Track every LOT you've ever bought with full cost attribution
- See exactly what your inventory can build right now
- Keep a complete shooting journal tied to the exact components on your bench

---

## Features

### 🧮 Live Round Calculator
The heart of the app. Select your caliber, recipe, and component lots — the calculator shows:
- **Exact cost** per round, per 50 / 100 / 1,000, and for a full lot
- **Brass reuse amortization** — spreads case cost across expected firings
- **HazMat & shipping** factored into every per-unit price
- **Factory ammo ROI** — compare your handload cost against a tracked market price
- **Capacity Engine** — tells you which component is your bottleneck and how many rounds you can build right now
- **Save Scenarios** — snapshot multiple configs side-by-side

### 📦 Purchases & Inventory
- Track **LOTs** of powder, bullets, primers, and brass with full cost breakdown
- Per-unit cost calculated from price + shipping + HazMat/tax combined
- **Barcode scanner** — scan a UPC from your phone camera or photo to auto-fill product data
- **Status tracking** — active / depleted / archived
- Multi-user attribution shows who added or last edited each lot

### 🧪 Recipes
- Full load definitions: caliber, charge weight, COAL, bullet length, case capacity, profile type
- Links to specific inventory lots (powder, bullet, primer, brass)
- **Cartridge visualizer** — live cross-section diagram as you fill out specs
- **Gyroscopic stability gauge** — calculates Miller stability factor from your firearm's twist rate
- Archive loads without deleting them
- Export to **Excel** or print a **Pro-style PDF data sheet** with QR code

### 📋 Batches
- Log a production run: "50 rounds of 6.5CM on 2024-11-15, Lot VAR-2024A powder"
- Inventory auto-decrements on save (powder by grains used, bullets/primers by count)
- **QR label printing** — generate 2.25" × 1.25" thermal labels for your ammo boxes
- Scan a label at the range to deep-link directly to that batch

### 🎯 Range Logs
- **Digital shooting journal**: date, firearm, distance, group size, velocity string, weather, temperature
- **SD / ES** — enter a velocity string and stats calculate automatically
- **MOA calculator** — auto-calculates from group size and distance
- **Target photo upload** — snap and attach a target image from your phone (Cloudinary hosted)
- **Print to PDF** — high-contrast ballistic certificate for your physical binder, includes QR back-link
- Deep-link from a QR-coded ammo box directly to the matching range session

### 🔫 Armory
- Firearms roster with platform, caliber, manufacturer, model, specs, and round count
- Round count auto-increments when you log a range session
- **Gear Locker** — track suppressors, optics, bipods, chronographs, and other accessories
- Auto-fill gear entries from a product URL (scrapes name, price, and image)
- Link gear to specific firearms

### 📊 Analytics
- Cost per round over time by caliber
- Velocity consistency charts (SD and ES trends across sessions)
- Component spend breakdown
- Production history (rounds loaded per month)

### 🤖 AI Assistant
- Optional AI chat assistant (powered by Google Gemini or compatible API)
- Asks about load data, troubleshooting, or general reloading questions
- Toggle enabled/disabled from admin settings

### 📱 PWA / Offline
- Installable as a native app on iOS and Android
- Offline mode — cached data available without a connection
- Pull-to-refresh gesture
- Haptic feedback throughout
- Ambient offline banner when disconnected

### 🔐 Auth & Multi-User
- **Invite-only** — admins create accounts, no public registration
- **HttpOnly session cookies** — no localStorage tokens, resistant to XSS
- Role system: `admin` (full read/write) and `shooter` (read-only)
- Full audit trail — every record shows who created and last modified it
- Password change and user management from Settings

---

## Tab Navigation

| Tab | Description |
|-----|-------------|
| **Calculator** | Live round cost calculator with scenario comparison |
| **Purchases** | Add and manage inventory lots with per-unit cost |
| **Inventory** | High-level investment summary and capacity overview |
| **Recipes** | Load definitions, ballistics, and PDF export |
| **Batches** | Production history and QR label printing |
| **Range** | Shooting session journal with photo and PDF export |
| **Armory** | Firearms roster and gear locker |
| **Analytics** | Cost and performance charts |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS (glassmorphism dark theme) |
| **Backend** | Node.js (Netlify Functions or standalone Express-compatible) |
| **Database** | PostgreSQL — Neon, Supabase, or self-hosted |
| **Auth** | Custom session auth with bcrypt password hashing |
| **Storage** | Cloudinary (target photos and gear images) |
| **PWA** | vite-plugin-pwa + Workbox service worker |

### Core Dependencies

| Package | Purpose |
|---------|---------|
| `pg` | PostgreSQL client |
| `bcryptjs` | Password hashing |
| `qrcode` | QR generation for labels and PDF exports |
| `html5-qrcode` | Barcode / QR camera scanner |
| `recharts` | Analytics charts |
| `exceljs` | Excel recipe export |
| `lucide-react` | UI icon set |
| `@google/generative-ai` | AI assistant (optional) |
| `vite-plugin-pwa` | PWA + service worker |
| `zustand` | Client-side state management |

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **PostgreSQL** database (Neon, Supabase, or local)
- (Optional) **Netlify CLI** for running functions locally
- (Optional) **Cloudinary** account for image uploads

### Local Development

```bash
# Clone
git clone https://github.com/To3Knee/reload-tracker.git
cd reload-tracker

# Install dependencies
npm install

# Copy and fill in env vars
cp .env.example .env   # edit with your values

# Start Vite dev server (frontend only)
npm run dev
```

To run with the backend functions locally:

```bash
npm install -g netlify-cli
netlify dev
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgres://user:password@host:5432/reload_tracker
PGSSLMODE=require

# API endpoint (/ for Netlify, http://localhost:3001 for standalone)
VITE_API_BASE_URL=/

# Require login before showing any data (true/false)
VITE_REQUIRE_LOGIN=true

# Cloudinary — for target photos and gear images
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=reload_tracker
```

AI assistant (configured in-app via Settings, but can be pre-set here):
```bash
# These are set via the Settings UI — no env var needed
# ai_enabled, ai_api_key, ai_model stored in the settings table
```

### Database Setup

1. Create a PostgreSQL database
2. Run the schema to create all tables:
   ```sql
   -- In your DB SQL editor or psql:
   \i backend/sql/schema_gold_master.sql
   ```
3. Seed demo data (optional):
   ```sql
   \i backend/sql/seed_demo_full.sql
   -- Creates an admin user (username: admin, password: admin123)
   -- CHANGE THIS PASSWORD before sharing access
   ```
4. To generate a bcrypt hash for a custom password:
   ```bash
   node backend/tools/generate_hash.js yourpassword
   ```

### First Admin Account

After running the schema, create your admin account manually via SQL or use the seed script. Then log in and go to **Settings → Access & Roles** to:
- Change your password
- Create accounts for other shooters

### Resetting Data (Keep Users)

To wipe all data without deleting user accounts (useful for dev/demo cleanup):

```sql
\i backend/sql/reset_data_keep_users.sql
```

---

## Deployment (Netlify)

1. Push to GitHub
2. Connect repo to Netlify
3. Set **environment variables** in Netlify dashboard (same as `.env` above)
4. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Netlify Functions handle the API automatically from `netlify/functions/`

The app auto-deploys on every push to `main`.

---

## Workflow Examples

### Full Loop: Bench → Range → Log

1. **Bench:** In **Recipes**, click *Load Batch* → enter rounds loaded
2. **Label:** Print a QR sticker from the new Batch → stick it on the ammo box
3. **Range:** Shoot. Scan the QR label with your phone
4. **Log:** App opens the matching batch — tap *Log Session*, upload a target photo, enter group size
5. **Archive:** Print a PDF ballistic certificate for your binder

### Inventory Capacity Check

1. Go to **Calculator**, select your primary recipe
2. The capacity panel shows which component is your bottleneck
   - *"Powder-limited: 312 rounds"*
3. Go to **Purchases** → reorder the limiting component

### Cost Comparison

1. In **Analytics**, select **Calculator** tab
2. Compare handload cost against factory ammo price side-by-side
3. See your savings percentage and break-even point

---

## Roadmap

- ✅ Live Round Calculator with scenario comparison
- ✅ LOT-based inventory with per-unit decimal math
- ✅ Recipe card export to PDF (pro data sheet)
- ✅ Range logs with Cloudinary image hosting
- ✅ Batch tracking with printable QR labels
- ✅ Deep linking (scan to open)
- ✅ Multi-user auth with role-based access
- ✅ Analytics dashboard (cost trends, velocity charts)
- ✅ Armory — firearms roster and gear locker
- ✅ Barcode scanner for product lookup
- ✅ PWA — installable, offline-capable
- ✅ AI assistant integration
- 🔲 Light mode / theme toggle
- 🔲 Supply chain tracker (price watching for components)
- 🔲 Shared range sessions (multi-shooter logs)

---

## Contributing

Pull requests, issues, and ideas are welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Make your changes
4. Open a PR — include screenshots if it touches the UI

---

## License

Reload Tracker is licensed under the **High Five License**. 🙌

By using this project you agree to:
- Give a high five (virtual or real) for the work
- Take full responsibility for how you use the data
- Always follow safe reloading practices

See the [LICENSE](LICENSE) file for full details.

---

**Stop guessing what your ammo costs. Start knowing.**
