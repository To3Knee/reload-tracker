
<p align="center">
  <img src="src/assets/logo.png" alt="Reload Tracker logo" width="260">
</p>

<h1 align="center">🔫 Reload Tracker 🔫</h1>

<p align="center">
  <strong>Beautiful, professional ammo cost & inventory tracking — without spreadsheets.</strong><br>
  Track every LOT, every recipe, and exactly what each round really costs.
</p>

<p align="center">

[![Netlify Status](https://api.netlify.com/api/v1/badges/fcaa3310-d64d-4f6c-af56-bbc08cfedcf2/deploy-status)](https://app.netlify.com/projects/reload-tracker/deploys)

 <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.4+-blue?style=flat-square" alt="Vite Version"></a>
 <a href="https://github.com/To3Knee/tsv-editor/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-High%20Five-yellow?style=flat-square" alt="License"></a>
</p>

<p align="center">
 [![Live App Demo](img.shields.io)](https://reload-tracker.netlify.app)
</p>

---

> ⚠️ **Safety & Responsibility**
>
> Reload Tracker is a **cost & inventory** tool only. It does **not** provide or endorse any load data.  
> Always use published load data from component manufacturers and trusted manuals, follow local laws, and reload at your own risk.

---

## 📸 Screenshot 

<p align="center">
  <img src="docs/screenshot.png" alt="Reload Tracker – main dashboard" width="900">
</p>

---

## 📚 Table of Contents

- [Why Reload Tracker?](#-why-reload-tracker)
- [Core Features](#-core-features)
- [Tour of the App](#-tour-of-the-app)
  - [Live Round Calculator](#-live-round-calculator)
  - [Purchases & LOTs](#-purchases--lots)
  - [Inventory View](#-inventory-view)
  - [Recipes & Ballistics](#-recipes--ballistics)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (local dev)](#quick-start-local-dev)
  - [Environment Variables](#-environment-variables)
- [Examples / Workflows](#-examples--workflows)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

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

## ✨ Core Features

- 🧮 **Live Cost Calculator**
  - Exact cost per round, per 50, per 100, per 1,000, and per custom lot size.
  - Includes price, shipping, HazMat, and tax in every calculation. :contentReference[oaicite:0]{index=0}  

- 🧾 **Purchases & LOT Tracking**
  - Each purchase becomes a LOT with brand, caliber, quantity, vendor, date, URL, status, and notes. :contentReference[oaicite:1]{index=1}  
  - Track **active** vs **depleted** LOTs without losing history.

- 📦 **Inventory Overview**
  - Total investment, total LOTs, total pieces across powder, bullets, primers, and brass.
  - Capacity pills: see whether you’re powder-limited, bullet-limited, primer-limited, or brass-limited for a selected recipe. :contentReference[oaicite:2]{index=2}  

- 📖 **Recipe Book**
  - Save named recipes with caliber, profile type (range, subsonic, competition, etc.), brass reuse, and default lot size.
  - Optional ballistics fields: bullet weight, muzzle velocity, power factor, zero distance, group size, and range notes. :contentReference[oaicite:3]{index=3}  
  - One-click **“Use in Calculator”** to snap the dashboard to a chosen recipe.

- 📊 **Inventory Capacity (This Recipe)**
  - For the selected recipe, see how many rounds you can build from your entire inventory and which component is limiting. :contentReference[oaicite:4]{index=4}  

- 🧪 **Saved “What-if” Configurations**
  - Inside the calculator, snapshot scenarios (caliber, charge, brass reuse, lot size, and resulting cost) and compare them side-by-side.

- 🕶️ **Polished Dark UI**
  - Glassmorphism cards, neon red highlights, and Inter font throughout for a “premium app” feel. :contentReference[oaicite:5]{index=5}  

- 🔞 **Age Gate**
  - Simple “I am 21 or older” confirmation before the app is accessible. :contentReference[oaicite:6]{index=6}  

- 🧹 **Per-device Reset**
  - “Reset local data (this device)” button for clearing local data during development or testing without affecting other devices. :contentReference[oaicite:7]{index=7}  

- 🧾 **Recipe PDF Export (Planned / WIP)**
  - The goal: export a recipe as a clean, printable card (for binders or range notes) with your logo at the top.

---

## 🧭 Tour of the App

The app is organized into clean tabs in the top-right navigation bar:

- **Calculator** – Live round cost calculator (default view). :contentReference[oaicite:8]{index=8}  
- **Purchases** – Add/edit LOTs and see per-unit costs.
- **Inventory** – High-level investment + capacity overview.
- **Recipes** – Manage recipes and ballistics data.

### 🧮 Live Round Calculator

Use the **Calculator** tab to see real-time costs:

- Pick a **caliber** (`9mm`, `.308`, `6.5 Creedmoor`, etc.).
- Select an optional **recipe** (or run purely manual).
- Choose which LOTs of **powder, bullets, primers, and brass** you’re pulling from.
- Enter your **charge weight (grains)** and **brass reuse**.
- Set a **lot size** (e.g., `200`, `500`, `1,000` rounds).

The calculator shows:

- Cost per round
- Cost per 50 / 100 / 1,000
- Cost for your selected lot size
- Detailed per-round breakdown for each component

All in one clean panel. :contentReference[oaicite:9]{index=9}  

### 🧾 Purchases & LOTs

In the **Purchases** tab you can:

- Record each purchase as a LOT with:
  - Component type (powder, bullets, primers, cases)
  - Brand & model
  - Caliber
  - Qty + unit (`ea`, `lb`, `gr`, `box`)
  - Price, shipping/HazMat, tax
  - Vendor, date, product URL, optional image URL
  - Notes and LOT status (active / depleted) :contentReference[oaicite:10]{index=10}  
- Filter by component type and caliber for quick lookup.
- See per-unit and total cost per LOT.

These LOTs power:

- The **Inventory** view
- The **Live Calculator** dropdowns
- Future features like lots history & analytics

### 📦 Inventory View

The **Inventory** tab gives you the high-level picture:

- Total dollars invested across all LOTs
- Number of LOTs
- Total pieces (bullets, primers, cases, etc.)
- A “capacity row” showing:
  - Powder-limited rounds
  - Bullet-limited rounds
  - Primer-limited rounds
  - Case-limited rounds
  - Max buildable rounds for the selected recipe

You also get gorgeous **LOT cards** with brand, caliber, per-unit cost, status, and purchase date. :contentReference[oaicite:11]{index=11}  

### 📖 Recipes & Ballistics

The **Recipes** tab is your “load notebook”:

- Give each recipe:
  - Name (e.g., `9mm – Range`, `.308 – Match`, `9mm – Subsonic`)
  - Caliber
  - Profile type (range, subsonic, competition, etc.)
  - Charge weight (grains)
  - Brass reuse (reloads per case)
  - Default lot size
  - Freeform notes

- Optional ballistics / performance metadata:
  - Bullet weight (gr)
  - Muzzle velocity (fps)
  - Power factor (auto-calculated)
  - Zero distance (yards)
  - Group size (inches)
  - Range notes (chrono, ES/SD, POI, conditions, etc.) :contentReference[oaicite:12]{index=12}  

From there:

- Use **“Use in Calculator”** to instantly apply the recipe on the Calculator tab.
- Edit or delete recipes as your data evolves.

---

## 🛠 Tech Stack

Under the hood:

- ⚛️ **React 18** powered SPA :contentReference[oaicite:13]{index=13}  
- ⚡ **Vite** dev/build tooling
- 🎨 **Tailwind CSS** + custom glassmorphism styles :contentReference[oaicite:14]{index=14}  
- 🧩 **Lucide React** icons for navigation :contentReference[oaicite:15]{index=15}  
- 🌐 Deployed easily via **Netlify** (with serverless functions for API access)
- 🗄️ Designed to integrate with a **PostgreSQL** backend via a small `db.js` abstraction (Netlify Functions, self-hosted API, etc.)

The goal is to keep the **UI and UX stable** while allowing the backing data layer (local only vs. shared DB) to evolve over time.

---

## 🚀 Getting Started

### Prerequisites

- Node.js **18+**
- npm, pnpm, or yarn
- (Optional) [Netlify CLI](https://docs.netlify.com/cli/get-started/) for local function + front-end dev

### Quick Start (local dev)

```bash
# Clone your fork
git clone https://github.com/To3Knee/reload-tracker.git
cd reload-tracker

# Install dependencies
npm install

# Start Vite dev server (front-end only)
npm run dev
````

Then open the printed local URL (usually `http://localhost:5173/`).

If you’re using Netlify Functions + a database:

```bash
# Install Netlify CLI globally (if needed)
npm install -g netlify-cli

# Start combined front-end + functions dev environment
netlify dev
```

> This will spin up the Vite dev server **and** your Netlify serverless functions (e.g., `purchases`, `recipes`).

### 🌱 Environment Variables

For a server-backed deployment (Netlify + Postgres), typical `.env` values might look like:

```bash
DATABASE_URL=postgres://user:password@host:5432/reload_tracker
PGSSLMODE=require
VITE_API_BASE_URL=/  # or your API base path, e.g. /.netlify/functions
```

* `DATABASE_URL` – connection string for your PostgreSQL instance.
* `PGSSLMODE` – SSL mode (e.g., `require` for managed DBs).
* `VITE_API_BASE_URL` – where the front-end should talk to the API (used inside `lib/db.js`).

Exact values will depend on how/where you deploy (Netlify, Render, Fly.io, etc.).

---

## 💡 Examples / Workflows

A few concrete ways you might use Reload Tracker:

### 1. New Powder Purchase

1. Go to **Purchases → Add / Edit LOT**.
2. Choose `Powder` as the component.
3. Enter brand, name, qty (`8 lb`), price, shipping/HazMat, and tax.
4. Save. You now have a **Powder LOT** with per-unit cost.

Now when you open the **Calculator** and pick that LOT + a recipe, the app will:

* Convert pounds → grains
* Divide total cost by total grains
* Multiply by your per-round charge to get a precise **powder cost per round**.

### 2. Range Recipe vs. Match Recipe

1. In **Recipes**, create:

   * `9mm – Range`
   * `9mm – Match`
2. Give each a different charge, brass reuse, and notes.
3. Hit **“Use in Calculator”** on each one to compare:

   * Per-round cost
   * Lot cost for 200 / 500 / 1,000 rounds
4. Save configurations inside the calculator to compare scenarios side-by-side.

### 3. Capacity Check Before a Match

1. Select your primary match recipe.
2. Go to **Inventory**.
3. Look at the capacity pills:

   * Powder-limited? Bullet-limited? Primer-limited?
4. Decide whether you need powder or bullets before your next big event.

---

## 🗺 Roadmap

Some ideas for future improvements:

* ✅ Recipe card export to PDF (more polish, custom logo placement)
* 🔄 Cloud sync & multi-device support via shared DB
* 📲 Optional barcode / QR scanning for purchases
* 🌗 Light mode / theme toggle
* 📤 CSV/JSON export & import of LOTs and recipes
* 📈 Historical charts (costs over time, usage per caliber)
* 🔔 Simple “reorder threshold” warnings per component

If you’re reading this and thinking *“I want that feature”* — PRs are welcome. 😄

---

## 🤝 Contributing

Pull requests, issues, and ideas are all welcome.

If you want to contribute:

1. Fork the repo.
2. Create a feature branch:
   `git checkout -b feature/your-idea`
3. Make your changes.
4. Run the app locally and sanity check the UI (especially:

   * Calculator
   * Purchases
   * Inventory
   * Recipes).
5. Open a PR with:

   * What you changed
   * Screenshots if it impacts the UI
   * Any migration notes if the data layer is affected

Please avoid:

* Changing the existing **core layout or visual theme** without discussion.
* Adding real-world load data or “how-to” reloading instructions to the repo.

---

## 📜 License

Reload Tracker is licensed under the **High Five License**. 🙌

By using this project you agree to:

* Give a **high five** (virtual or real) for the work,
* Take full responsibility for how you use the data and the app, and
* Always follow safe reloading practices from authoritative sources.

See the full text in [LICENSE](LICENSE).

---

**Stop guessing what your ammo costs. Start knowing.**
Clone it, deploy it, and make Reload Tracker your own. 🔧💥


