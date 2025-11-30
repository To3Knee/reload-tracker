<p align="center">
  <img src="src/assets/logo.png" alt="Reload Tracker logo" width="260">
</p>

<h1 align="center">💥 Reload Tracker 💥</h1>

<p align="center">
  <strong>The professional inventory & cost management system for reloaders.</strong><br>
  Now with secure multi-user authentication, audit trails, and precision math.
</p>

<p align="center">
  <a href="#"><img alt="ChatGPT" src="https://img.shields.io/badge/ChatGPT-74aa9c?logo=openai&logoColor=white"></a>
  <a href="#"><img alt="Firefox" src="https://img.shields.io/badge/Firefox-FF7139?logo=firefoxbrowser&logoColor=white"></a>
  <a href="#"><img alt="Netlify" src="https://img.shields.io/badge/Netlify-%23000000.svg?logo=netlify&logoColor=%2300C7B7"></a>
  <a href="#"><img alt="Notepad++" src="https://img.shields.io/badge/Notepad++-90E59A.svg?&logo=notepad%2b%2b&logoColor=black"></a>
  <a href="#"><img alt="Postgres" src="https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white"></a>
  <a href="#"><img alt="npm" src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=fff"></a>
  <a href="#"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white"></a>
  <a href="#"><img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff"></a>
  <a href="#"><img alt="React" src="https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB"></a>
  <a href="#"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white"></a>
  <a href="#"><img alt="TOML" src="https://img.shields.io/badge/TOML-9C4121?logo=toml&logoColor=fff"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff"></a>
  <a href="#"><img alt="iOS" src="https://img.shields.io/badge/iOS-000000?&logo=apple&logoColor=white"></a>
  <a href="#"><img alt="Android" src="https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white"></a>
  <a href="#"><img alt="Cloudflare"src="https://img.shields.io/badge/Cloudflare-F38020?logo=Cloudflare&logoColor=white"></a>
</p>
<h2 align="center">LIVE RELOAD TRACKER DEMO</h2>

<p align="center">
  <a href="https://demo.reloadtracker.com">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-reloadtracker.com-00C7B7?style=for-the-badge&logo=netlify&logoColor=white">
  </a>
</p>

---

> ⚠️ **Safety & Responsibility**
>
> Reload Tracker is a **data management** tool only. Follow local laws, and reload at your own risk. Always verify load data against published manuals

---

## 📸 Screenshot 

<p align="center">
  <img src="docs/screenshot.png" alt="Reload Tracker – main dashboard" width="900">
</p>

---

## 🎯 Why Reload Tracker?

Reloading costs can get fuzzy fast:

- Powder by the pound (or kilo)  
- Bullets by the thousand  
- Primers in sleeves, cases in bulk  
- Shipping, HazMat, and tax sprinkled on top  

Reload Tracker turns all of that into **clear per-round math** with a **clean, modern UI**:

- No more “🤷‍♂️ I think my 9mm is about 20¢/rd?”
- Know **exactly** what your match, range, or subsonic loads cost.
- Keep a living record of every LOT you’ve ever bought.

---

# 📚 Features

### 🧮 Live Round Calculator
The heart of the app.
- Exact cost per round, per 50/100/1000.
- Factors in **Brass Reuse**, **HazMat fees**, and **Shipping**.
- Compare "Saved Scenarios" side-by-side.

### 🧾 Inventory & Batches
- Track **LOTs** of Powder, Bullets, Primers, and Brass.
- **Capacity Engine:** Tells you exactly how many rounds you can build right now.
- **Batch Logging:** Record exactly when you loaded ammo and which components you used.
- **QR Label Printing:** Generate 2.25" x 1.25" thermal labels for your ammo boxes. Scan the label to open the log.

### 🎯 Range Logs & Ballistics
- **Digital Range Journal:** Log group sizes, velocities (SD/ES), and weather conditions.
- **Photo Storage:** Upload target photos directly from your phone (hosted via Cloudinary).
- **MOA Calculator:** Auto-calculates MOA based on distance and group size.
- **Binder Export:** Print beautiful, "Pro-style" PDF reports for your physical logbook.

### 🛡️ Admin & Security
- **Invite-Only System:** Admins create accounts for other users.
- **Secure Auth:** HttpOnly session cookies (no localStorage tokens).
- **Portable API:** Runs on Netlify Functions or any Node.js server.

---

## 🧭 Tour of the App

The app is organized into clean tabs in the top-right navigation bar:

- **Calculator** – Live round cost calculator.
- **Purchases** – Add/edit LOTs and see per-unit costs.
- **Inventory** – High-level investment + capacity overview.
- **Recipes** – Manage recipes and ballistics data.
- **Batches** – Track production history and print labels.
- **Range** – Log shooting sessions and target photos.

### 🧮 Live Round Calculator

Use the **Calculator** tab to see real-time costs:
- Pick a **caliber** (`9mm`, `.308`, `6.5 Creedmoor`, etc.).
- Select an optional **recipe** (or run purely manual).
- Choose which LOTs of **powder, bullets, primers, and brass** you’re pulling from.
- Enter your **charge weight (grains)** and **brass reuse**.

The calculator shows:
- Cost per round, per 50 / 100 / 1,000.
- Detailed per-round breakdown for each component.

### 📦 Batches & QR Codes

The **Batches** tab creates a bridge between your reloading bench and the range:
1. **Log a Batch:** "I loaded 100 rounds of .308 using Recipe X on Nov 29th."
2. **Print Label:** Click the printer icon to generate a QR sticker for your ammo box.
3. **Scan:** At the range, scan the box with your phone to instantly pull up the load data in the app.

### 🎯 Range Performance

The **Range** tab is your performance database:
- **Log Session:** Enter distance, group size, velocity data, and notes.
- **Upload Photo:** Use your phone's camera to snap the target. The app auto-resizes and stores it securely.
- **Print to PDF:** Export a high-contrast page for your physical 3-ring binder, complete with a QR code that links back to the digital record.

---

## 🛠 Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS (Glassmorphism theme)
* **Backend:** Node.js API (Adapter-based for Netlify Functions)
* **Database:** PostgreSQL (Neon, Supabase, or self-hosted)
* **Storage:** Cloudinary (for target images)
* **Auth:** Custom session-based auth with PBKDF2 hashing.

### 📦 Core Dependencies
The app relies on these packages (auto-installed via `npm install`):
| Package | Usage |
| :--- | :--- |
| **`pg`** | Database connection for Netlify Functions. |
| **`qrcode`** | Generates QR labels for Batches and Range Logs. |
| **`lucide-react`** | The modern UI icon set. |
| **`exceljs`** | Powers the "Export to Excel" reporting. |
| **`recharts`** | Renders the Analytics charts. |
| **`@google/generative-ai`** | Powers the AI assistant. |
---

## 🚀 Getting Started

### Prerequisites

- Node.js **18+**
- (Optional) [Netlify CLI](https://docs.netlify.com/cli/get-started/) for local function dev

### Quick Start (local dev)

```bash
# Clone your fork
git clone [https://github.com/To3Knee/reload-tracker.git](https://github.com/To3Knee/reload-tracker.git)
cd reload-tracker

# Install ALL dependencies
# (This includes pg, qrcode, exceljs, recharts, etc.)
npm install

# Start Vite dev server (front-end only)
npm run dev
````

If you’re using Netlify Functions + Database:

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Start combined front-end + functions dev environment
netlify dev
```
### 🔑 First Run (Create Admin User)

After deploying to Netlify and connecting your Database, your app will be empty and locked.
To create your first **Admin** account:

1. Open your Database SQL Editor (Neon, Supabase, etc).
2. Run the schema script: `backend/sql/schema_full.sql` (Creates tables).
3. Run the bootstrap script: `backend/sql/bootstrap_admin.sql` (Creates Admin user).
4. Log in with:
   * **User:** `admin`
   * **Pass:** `admin`
   
> **Note:** Immediately go to Settings > Access & Roles and change your password!

### 🌱 Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgres://user:password@host:5432/reload_tracker
PGSSLMODE=require

# API Base
VITE_API_BASE_URL=/ 

# Cloudinary (Images)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=reload_tracker
```

-----

## 💡 Examples / Workflows

### 1\. The "Full Loop" (Load -\> Shoot -\> Log)

1.  **Bench:** In **Recipes**, click "Load Batch". Enter 50 rounds.
2.  **Label:** Click "Print Label" on the new Batch. Stick the QR code on your ammo box.
3.  **Range:** Finish shooting. Scan the QR code on the box.
4.  **Log:** The app opens. Click "Log Session". Snap a photo of your target. Enter your group size (e.g., 0.75").
5.  **Archive:** Back home, click "Print" on the Range Log to put a physical page in your binder.

### 2\. Inventory Capacity Check

1.  Select your primary match recipe.
2.  Go to **Inventory**.
3.  Look at the capacity pills to see what is holding you back (e.g., "Primer-limited: 450 rounds").

-----

## 🗺 Roadmap

  * ✅ Recipe card export to PDF (Pro styling)
  * ✅ Range Logs with Cloudinary Image Hosting
  * ✅ Batch Tracking with Printable QR Labels
  * ✅ Deep Linking (Scan to open)
  * ✅ Cloud sync & multi-device support via shared DB
  * 🌗 Light mode / theme toggle
  * ✅ Analytics Dashboard (Cost over time, Velocity consistency charts)
  * 🔍 Ammo Price Finder (External API integration)

-----

## 🤝 Contributing

Pull requests, issues, and ideas are all welcome.

If you want to contribute:

1.  Fork the repo.
2.  Create a feature branch: `git checkout -b feature/your-idea`
3.  Make your changes.
4.  Open a PR with screenshots if it impacts the UI.

-----

## 📜 License

Reload Tracker is licensed under the **High Five License**. 🙌

By using this project you agree to:

  * Give a **high five** (virtual or real) for the work,
  * Take full responsibility for how you use the data, and
  * Always follow safe reloading practices.

See the [LICENSE](LICENSE) file for the full, fist-bumping details!

---

**Stop guessing what your ammo costs. Start knowing.**
Clone it, deploy it, and make Reload Tracker your own. 🔧💥


