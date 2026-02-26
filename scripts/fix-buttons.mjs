import { readFileSync, writeFileSync } from 'fs'

const files = [
  'src/components/Purchases.jsx',
  'src/components/Recipes.jsx',
  'src/components/RangeLogs.jsx',
  'src/components/Armory.jsx',
  'src/components/GearLocker.jsx',
]

// Targeted string replacements — most specific wins
const subs = [
  // ── Primary red submit buttons ──────────────────────────────────────────
  ['px-6 py-2 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition',            'rt-btn rt-btn-primary'],
  ['px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition',            'rt-btn rt-btn-primary'],
  ['px-4 py-2 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition',            'rt-btn rt-btn-primary'],
  ['inline-flex items-center px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold shadow-lg shadow-red-900/40 transition disabled:opacity-60 text-white', 'rt-btn rt-btn-primary disabled:opacity-60'],
  ['w-full py-2 rounded-full bg-red-700 text-white font-bold text-xs hover:bg-red-600 transition shadow-lg shadow-red-900/20', 'rt-btn rt-btn-primary w-full justify-center'],
  ['px-5 py-1.5 rounded-full bg-red-700 hover:bg-red-600 disabled:opacity-60 text-[11px] font-semibold shadow-lg shadow-red-900/40 transition', 'rt-btn rt-btn-primary disabled:opacity-60'],

  // ── Secondary toolbar buttons (zinc-800) ────────────────────────────────
  ['px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-red-500/50 hover:text-white transition flex items-center gap-2',   'rt-btn rt-btn-secondary'],
  ['px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-emerald-500/50 hover:text-white transition flex items-center gap-2', 'rt-btn rt-btn-secondary'],
  ['px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-emerald-500/50 hover:text-white transition flex items-center gap-2', 'rt-btn rt-btn-secondary'],
  ['mb-2 px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 hover:border-red-500/50 hover:text-white transition flex items-center gap-2', 'rt-btn rt-btn-secondary'],
  ['px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 transition flex items-center gap-2', 'rt-btn rt-btn-secondary'],

  // ── Cancel ghost (border only) ─────────────────────────────────────────
  ['px-4 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800/60 text-[11px] font-semibold transition', 'rt-btn rt-btn-secondary'],
  ['px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition',                  'rt-btn rt-btn-secondary'],
  ['px-4 py-2 rounded-full border border-zinc-600 text-zinc-300 hover:bg-zinc-800/60 text-xs font-bold transition',               'rt-btn rt-btn-secondary'],
  ['px-4 py-2 rounded-full border border-slate-600 text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition',        'rt-btn rt-btn-secondary'],

  // ── Small ghost action buttons ──────────────────────────────────────────
  ['px-3 py-1 rounded-full bg-black/60 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center', 'rt-btn rt-btn-ghost w-full justify-center'],
  ['px-3 py-1.5 rounded-full bg-black/60 border border-slate-700 text-slate-300 text-[10px] hover:text-white hover:bg-slate-800 transition flex items-center gap-1', 'rt-btn rt-btn-ghost'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 text-slate-400 text-[10px] transition', 'rt-btn rt-btn-ghost'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:bg-slate-800/80 transition cursor-pointer text-[10px]', 'rt-btn rt-btn-ghost'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 text-slate-400 text-[10px] transition flex items-center gap-1', 'rt-btn rt-btn-ghost hover:text-emerald-400 hover:border-emerald-700'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer text-[10px] text-slate-400 flex items-center gap-1', 'rt-btn rt-btn-ghost hover:text-emerald-400 hover:border-emerald-700'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-slate-700 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1 text-[10px]', 'rt-btn rt-btn-ghost hover:text-emerald-400 hover:border-emerald-700'],
  ['px-3 py-1.5 rounded-full bg-black/60 border border-slate-700 text-slate-300 text-[10px] hover:text-white hover:bg-slate-800 transition flex items-center gap-1', 'rt-btn rt-btn-ghost'],

  // ── Danger delete buttons ───────────────────────────────────────────────
  ['px-3 py-1 rounded-full bg-black/60 border border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition cursor-pointer text-[10px] flex items-center gap-1 w-full justify-center', 'rt-btn rt-btn-danger w-full justify-center'],
  ['px-3 py-1.5 rounded-full bg-black/60 border border-red-900/40 text-red-400 text-[10px] hover:text-red-300 hover:bg-red-900/20 transition flex items-center gap-1', 'rt-btn rt-btn-danger'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-300 hover:bg-red-900/40 transition cursor-pointer text-[10px]', 'rt-btn rt-btn-danger'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-red-700/70 text-red-400 hover:bg-red-900/40 text-[10px] transition', 'rt-btn rt-btn-danger'],
  ['px-3 py-1.5 rounded-full bg-black/60 border border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition flex items-center gap-1', 'rt-btn rt-btn-danger'],

  // ── Confirm (delete confirmation — solid red) ───────────────────────────
  ['px-3 py-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold hover:bg-red-500 transition', 'rt-btn rt-btn-primary'],

  // ── Emerald "use in calculator" / confirm ───────────────────────────────
  ['px-2 py-[2px] rounded-full bg-black/60 border border-emerald-500/40 text-emerald-300 hover:border-emerald-500/70 hover:text-emerald-300 transition cursor-pointer text-[10px]', 'rt-btn rt-btn-confirm'],
  ['px-2 py-[2px] rounded-full bg-black/60 border border-emerald-900/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition cursor-pointer text-[10px] flex items-center gap-1', 'rt-btn rt-btn-confirm'],

  // ── Emerald batch/load action ───────────────────────────────────────────
  ['px-2 py-[2px] rounded-full bg-black/60 border border-red-500/40 text-red-300 hover:border-red-500/70 hover:text-red-200 transition cursor-pointer flex items-center gap-1 text-[10px]', 'rt-btn rt-btn-danger'],

  // ── Amber archive toggle ────────────────────────────────────────────────
  ["px-2 py-[2px] rounded-full bg-black/60 border border-amber-400 text-amber-300 hover:bg-amber-500/10 transition cursor-pointer text-[10px] ", 'rt-btn rt-btn-ghost border-amber-800/60 text-amber-500 hover:text-amber-300 '],

  // ── Card wrappers ───────────────────────────────────────────────────────
  ['glass rounded-2xl p-6', 'glass p-6'],
  ['bg-black/40 border border-slate-800 rounded-2xl p-6', 'rt-card p-6'],
  ['bg-black/20 rounded-xl p-4 border border-slate-800/50', 'rt-card p-4'],
  ['bg-black/40 rounded-xl', 'rt-card'],
  ['bg-black/20 rounded-xl p-3 border border-zinc-800', 'rt-card p-3'],
]

for (const f of files) {
  let c = readFileSync(f, 'utf8')
  const orig = c
  for (const [from, to] of subs) {
    c = c.replaceAll(from, to)
  }
  if (c !== orig) {
    writeFileSync(f, c)
    console.log('Updated: ' + f)
  } else {
    console.log('No change: ' + f)
  }
}
console.log('Done.')
