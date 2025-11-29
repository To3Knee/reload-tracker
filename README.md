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
  <a href="https://reloadtracker.com">
    <img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-reloadtracker.com-00C7B7?style=for-the-badge&logo=netlify&logoColor=white">
  </a>
</p>

---

> ⚠️ **Safety & Responsibility**
>
> Reload Tracker is a **cost & inventory** tool only. Follow local laws, and reload at your own risk.

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

## 📚 Features

### 🧮 Live Round Calculator
The heart of the app.
- Exact cost per round, per 50/100/1000.
- Factors in **Brass Reuse**, **HazMat fees**, and **Shipping**.
- Compare "Saved Scenarios" side-by-side.

### 🧾 Inventory Management
- Track **LOTs** of Powder, Bullets, Primers, and Brass.
- Track **Active** vs. **Depleted** stock.
- **Capacity Engine:** Tells you exactly how many rounds you can build right now based on your limiting component (e.g., "You are primer-limited to 450 rounds").

### 📖 Recipe Book
- Store your load data with ballistics (Velocity, Power Factor, Zero).
- **"Use in Calculator"** button snaps your dashboard to that recipe instantly.
- **Printable Cards:** Generate a clean, high-contrast PDF card for your range bag.

### 🛡️ Admin & Security
- **Invite-Only System:** Admins create accounts for other users.
- **Secure Auth:** HttpOnly session cookies (no localStorage tokens).
- **Portable API:** Runs on Netlify Functions or any Node.js server.

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


### 🧾 Purchases & LOTs

In the **Purchases** tab you can:

- Record each purchase as a LOT with:
  - Component type (powder, bullets, primers, cases)
  - Brand & model
  - Caliber
  - Qty + unit (`ea`, `lb`, `gr`, `box`)
  - Price, shipping/HazMat, tax
  - Vendor, date, product URL, optional image URL
  - Notes and LOT status (active / depleted) 
- Filter by component type and caliber for quick lookup.
- See per-unit and total cost per LOT.


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

* **Frontend:** React 18, Vite, Tailwind CSS (Glassmorphism theme)
* **Backend:** Node.js API (Adapter-based for Netlify Functions or Express)
* **Database:** PostgreSQL (Neon, Supabase, or self-hosted)
* **Auth:** Custom session-based auth with PBKDF2 hashing (No external auth providers required).

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


