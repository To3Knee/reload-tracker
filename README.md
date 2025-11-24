

<p align="center">
  <img src="src/assets/logo.png" alt="Reload Tracker" width="260">
</p>

<h1 align="center">🔫  Reload Tracker 🔫  </h1>

**The most beautiful, professional, and powerful reloading cost & inventory web app — 100% free, open-source, and runs completely in your browser.**

Track every penny you spend on powder, primers, bullets, and brass. Know exactly how much your 9mm subsonics, .308 match loads, or 6.5 Creedmoor precision rounds cost — down to the thousandth of a cent — including shipping, HazMat, and tax.

Works perfectly on **desktop** and **iPhone** (installable as a PWA — feels like a native app).

Live Demo → https://reloading-tracker.netlify.app  

### Features

- Gorgeous dark glassmorphism UI (looks like a $500 commercial app)
- Full inventory tracking — knows exactly how many grains of powder, primers, bullets, and cases you have left
- Automatic true per-unit cost (1 lb vs 8 lb jugs, 1k vs 5k primers — it calculates correctly every time)
- Shipping + HazMat + Tax fields on every purchase
- Unlimited recipes (standard, subsonic, match, plinking, etc.)
- Zero-cost brass toggle (range pickup = $0)
- Live cost-per-round calculator for 9mm • .45 ACP • .308 Win • 6.5 Creedmoor (and easy to add more)
- "Rounds you can still load" counter for every recipe
- Offline-first PWA — works with no internet after first load
- All data stored locally in your browser (IndexedDB) — nothing sent to servers
- Export/Import your entire database as JSON
- 100% free • open source • no ads • no tracking

### Pre-loaded with 2025 economical components

- Hodgdon Titegroup, HP-38, Red Dot, IMR 4895, Varget, H4350
- Berry’s plated bullets, Hornady ELD-M, Armscor FMJ
- CCI #500, #300, #200 primers
- Standard + subsonic recipes for all four calibers
- Real bulk pricing from MidwayUSA, Powder Valley, Widener’s

### Tech Stack

- React 18 + Vite
- Tailwind CSS + Lucide icons
- IndexedDB via idb (offline-first)
- Fully static — deploys free on Netlify, Vercel, Cloudflare Pages, or GitHub Pages

### Quick Start

1. Click **"Use this template"** → create your own repo
2. Connect to Netlify (or Vercel/Cloudflare)
3. Deploy in 30 seconds → get your own live URL
4. (Optional) Install as an app on your phone (iPhone: Share → Add to Home Screen)

### Adding New Calibers / Components

Just add rows in the **Purchases** and **Recipes** tabs — everything auto-updates. Want .300 Blackout, .223, or 6mm ARC? Takes 2 minutes.

### Contributing

Pull requests welcome! Especially:
- New calibers & recipes
- Barcode scanning for purchases
- Firebase/Supabase cloud sync
- Dark/light theme toggle
- Export to PDF load labels

### License

MIT © 2025 — Fork it, modify it, sell it, make it yours.

---

**Stop guessing what your ammo costs. Start knowing.**

Deploy your own → click **"Use this template"** now.
