/* ============================================================
   Copilot Studio Credit Estimator
   Standard harness vs GitHub Copilot harness
   Rates per Microsoft Learn (Aug 2026):
   - Standard: classic 1 / generative 2 / agent action 5 /
     tenant graph 10 / agent flow 13 per 100 actions /
     AI tools 0.1|1.5|10 per 1K tokens / reasoning +10 per 1K /
     content processing 8 per page. B2E use by M365 Copilot
     licensed users = no charge (fair use).
   - GitHub Copilot harness: usage-based Copilot Credits.
     Light 100-300, Medium 300-500, Heavy >500 per task.
     Building/testing/evals billed from first build action.
     No M365 Copilot inclusion.
   - PAYG $0.01/credit. Pack $200 / 25,000 credits.
   ============================================================ */
(() => {
"use strict";

const $ = id => document.getElementById(id);
const PACK_CREDITS = 25000;

/* ---------- rate card (editable, locked by default) ---------- */
const RATE_DEFAULTS = {
  rClassic: 1, rGen: 2, rActions: 5, rGraph: 10,
  rFlow: 13, rPages: 8, rReason: 10,
};
const MID_DEFAULTS = { gLightMid: 200, gMediumMid: 400, gHeavyMid: 700 };

/* ---------- state ---------- */
const state = {
  users: 500, sessions: 12, m365Users: 100,
  sClassic: 2, sGen: 3, sActions: 2, sGraph: 1, sFlow: 0,
  sTokens: 0, sTier: 1.5, sReason: 0, sPages: 0,
  gLight: 70, gMedium: 25,
  gLightMid: 200, gMediumMid: 400, gHeavyMid: 700,
  gMakers: 2, gTestRuns: 60, gTestCr: 150,
  pPayg: 0.01, pPack: 200, pDisc: 0,
  ...RATE_DEFAULTS,
};

const PRESETS = {
  faq:        { users: 2000, sessions: 8,  m365Users: 0,   sClassic: 5, sGen: 1, sActions: 0, sGraph: 0, sFlow: 0, sTokens: 0, sTier: 0.1, sReason: 0, sPages: 0, gLight: 95, gMedium: 5,  gMakers: 1, gTestRuns: 30,  gTestCr: 120 },
  support:    { users: 900,  sessions: 15, m365Users: 0,   sClassic: 2, sGen: 4, sActions: 2, sGraph: 0, sFlow: 20, sTokens: 2, sTier: 1.5, sReason: 0, sPages: 0, gLight: 70, gMedium: 25, gMakers: 2, gTestRuns: 60,  gTestCr: 150 },
  employee:   { users: 500,  sessions: 12, m365Users: 200, sClassic: 1, sGen: 4, sActions: 2, sGraph: 3, sFlow: 0,  sTokens: 0, sTier: 1.5, sReason: 0, sPages: 0, gLight: 60, gMedium: 30, gMakers: 2, gTestRuns: 60,  gTestCr: 150 },
  autonomous: { users: 1,    sessions: 3000, m365Users: 0, sClassic: 0, sGen: 1, sActions: 4, sGraph: 0, sFlow: 60, sTokens: 1, sTier: 1.5, sReason: 0, sPages: 2, gLight: 40, gMedium: 45, gMakers: 2, gTestRuns: 80, gTestCr: 200 },
  frontier:   { users: 200,  sessions: 20, m365Users: 60,  sClassic: 0, sGen: 4, sActions: 5, sGraph: 2, sFlow: 0,  sTokens: 4, sTier: 10, sReason: 8, sPages: 3, gLight: 20, gMedium: 45, gMakers: 3, gTestRuns: 120, gTestCr: 300 },
};

/* ---------- formatting ---------- */
const fmtInt = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtCr = n => n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 10000 ? (n / 1e3).toFixed(1) + "K" : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
function fmtMoney(n) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e4) return "$" + Math.round(n).toLocaleString("en-US");
  if (n >= 100) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/* ---------- core model ---------- */
function stdPerSessionCredits(s) {
  return s.sClassic * s.rClassic
       + s.sGen * s.rGen
       + s.sActions * s.rActions
       + s.sGraph * s.rGraph
       + s.sFlow * s.rFlow / 100
       + s.sTokens * s.sTier
       + s.sReason * s.rReason
       + s.sPages * s.rPages;
}

function ghcpPerTaskCredits(s) {
  const heavy = Math.max(0, 100 - s.gLight - s.gMedium);
  return (s.gLight * s.gLightMid + s.gMedium * s.gMediumMid + heavy * s.gHeavyMid) / 100;
}

function licensedUsers(s) {
  return Math.min(s.m365Users, s.users);
}

function compute(s) {
  const totalSessions = s.users * s.sessions;
  const unlicensedShare = s.users > 0 ? 1 - licensedUsers(s) / s.users : 1;

  // Standard harness
  const stdPerSess = stdPerSessionCredits(s);
  const stdTotalCredits = stdPerSess * totalSessions;
  const stdBillableCredits = stdTotalCredits * unlicensedShare;   // M365 B2E usage = no charge
  const stdFreeCredits = stdTotalCredits - stdBillableCredits;

  // GitHub Copilot harness — no license inclusion; dev burn billed
  const ghcpPerTask = ghcpPerTaskCredits(s);
  const ghcpRuntimeCredits = ghcpPerTask * totalSessions;
  const ghcpDevCredits = s.gMakers * s.gTestRuns * s.gTestCr;
  const ghcpTotalCredits = ghcpRuntimeCredits + ghcpDevCredits;

  const disc = 1 - s.pDisc / 100;
  const paygRate = s.pPayg * disc;
  const packPrice = s.pPack * disc;

  return {
    totalSessions, unlicensedShare, stdPerSess, stdTotalCredits, stdBillableCredits, stdFreeCredits,
    ghcpPerTask, ghcpRuntimeCredits, ghcpDevCredits, ghcpTotalCredits,
    paygRate, packPrice,
    stdBuy: bestBuy(stdBillableCredits, paygRate, packPrice),
    ghcpBuy: bestBuy(ghcpTotalCredits, paygRate, packPrice),
  };
}

/* cheapest blend of prepaid packs + PAYG overflow */
function bestBuy(credits, paygRate, packPrice) {
  const paygOnly = credits * paygRate;
  const fullPacks = Math.floor(credits / PACK_CREDITS);
  const options = [];
  for (const packs of new Set([0, fullPacks, fullPacks + 1])) {
    const covered = Math.min(credits, packs * PACK_CREDITS);
    const overflow = credits - covered;
    options.push({ packs, cost: packs * packPrice + overflow * paygRate, overflow });
  }
  options.sort((a, b) => a.cost - b.cost);
  const best = options[0];
  // overage enforcement: agents can be disabled beyond 125% of prepaid capacity
  const overageRisk = best.packs > 0 && credits > best.packs * PACK_CREDITS * 1.25;
  return { ...best, paygOnly, savings: Math.max(0, paygOnly - best.cost), overageRisk, credits };
}

/* ---------- UI sync helpers ---------- */
function bindPair(rangeId, numId, key, opts = {}) {
  const r = $(rangeId), n = $(numId);
  const set = v => {
    v = Math.max(+n.min || 0, Math.min(+n.max || Infinity, +v || 0));
    state[key] = v;
    r.value = Math.min(+r.max, v);
    n.value = v;
    if (opts.onChange) opts.onChange();
    recalc();
  };
  r.addEventListener("input", () => set(r.value));
  n.addEventListener("input", () => set(n.value));
  return set;
}

/* number-only inputs (incl. rate card + mirrored GHCP midpoints) */
const NUM_BINDINGS = {
  gLightMid: "gLightMid", gMediumMid: "gMediumMid", gHeavyMid: "gHeavyMid",
  pPayg: "pPayg", pPack: "pPack",
  rClassic: "rClassic", rGen: "rGen", rActions: "rActions", rGraph: "rGraph",
  rFlow: "rFlow", rPages: "rPages", rReason: "rReason",
  rgLightMid: "gLightMid", rgMediumMid: "gMediumMid", rgHeavyMid: "gHeavyMid",
};
function bindNum(numId, key) {
  const n = $(numId);
  n.addEventListener("input", () => { state[key] = +n.value || 0; syncNumInputs(numId); recalc(); });
}
function syncNumInputs(skipId) {
  for (const [id, key] of Object.entries(NUM_BINDINGS)) {
    if (id !== skipId) $(id).value = state[key];
  }
}

const setters = {};
setters.users     = bindPair("inUsers", "inUsersN", "users", { onChange: clampM365 });
setters.sessions  = bindPair("inSessions", "inSessionsN", "sessions");
setters.m365Users = bindPair("inM365", "inM365N", "m365Users", { onChange: clampM365 });
setters.sClassic = bindPair("sClassic", "sClassicN", "sClassic");
setters.sGen     = bindPair("sGen", "sGenN", "sGen");
setters.sActions = bindPair("sActions", "sActionsN", "sActions");
setters.sGraph   = bindPair("sGraph", "sGraphN", "sGraph");
setters.sFlow    = bindPair("sFlow", "sFlowN", "sFlow");
setters.sTokens  = bindPair("sTokens", "sTokensN", "sTokens");
setters.sReason  = bindPair("sReason", "sReasonN", "sReason");
setters.sPages   = bindPair("sPages", "sPagesN", "sPages");
setters.gLight   = bindPair("gLight", "gLightN", "gLight", { onChange: clampMix });
setters.gMedium  = bindPair("gMedium", "gMediumN", "gMedium", { onChange: clampMix });
setters.gMakers  = bindPair("gMakers", "gMakersN", "gMakers");
setters.gTestRuns= bindPair("gTestRuns", "gTestRunsN", "gTestRuns");
setters.gTestCr  = bindPair("gTestCr", "gTestCrN", "gTestCr");
setters.pDisc    = bindPair("pDisc", "pDiscN", "pDisc");
for (const [id, key] of Object.entries(NUM_BINDINGS)) bindNum(id, key);

function clampMix() {
  if (state.gLight + state.gMedium > 100) {
    state.gMedium = 100 - state.gLight;
    $("gMedium").value = state.gMedium;
    $("gMediumN").value = state.gMedium;
  }
}

/* licensed users can never exceed active users — cap the inputs themselves
   so the slider physically can't go past the user count */
function clampM365() {
  $("inM365").max = state.users;
  $("inM365N").max = state.users;
  if (state.m365Users > state.users) {
    state.m365Users = state.users;
    $("inM365N").value = state.m365Users;
  }
  $("inM365").value = Math.min(state.m365Users, state.users);
}

/* AI tool tier segmented control */
$("sTier").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  [...$("sTier").children].forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  state.sTier = +b.dataset.v;
  recalc();
});

/* presets */
$("presets").addEventListener("click", e => {
  const b = e.target.closest(".preset");
  if (!b) return;
  document.querySelectorAll(".preset").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  applyPreset(PRESETS[b.dataset.preset]);
});
function applyPreset(p) {
  Object.assign(state, p);
  clampM365();
  for (const [k, set] of Object.entries(setters)) if (k in p) {
    // update inputs without recursive recalc storms — setters call recalc anyway
    const rid = { users: "inUsers", sessions: "inSessions", m365Users: "inM365" }[k];
    const r = $(rid || k), n = $((rid || k) + "N");
    if (r) r.value = Math.min(+r.max, state[k]);
    if (n) n.value = state[k];
  }
  // tier segmented control
  [...$("sTier").children].forEach(x => x.classList.toggle("active", +x.dataset.v === state.sTier));
  syncNumInputs();
  recalc();
}

/* ---------- rate card lock / unlock ---------- */
const RATE_KEYS = Object.keys(RATE_DEFAULTS);
const RATE_INPUT_IDS = ["rClassic", "rGen", "rActions", "rGraph", "rFlow", "rPages", "rReason", "rgLightMid", "rgMediumMid", "rgHeavyMid"];
let ratesLocked = true;

function ratesCustom() {
  return RATE_KEYS.some(k => state[k] !== RATE_DEFAULTS[k])
      || Object.keys(MID_DEFAULTS).some(k => state[k] !== MID_DEFAULTS[k]);
}

function setRatesLocked(locked) {
  ratesLocked = locked;
  RATE_INPUT_IDS.forEach(id => { $(id).disabled = locked; });
  $("btnUnlockRates").textContent = locked ? "🔒 Unlock to edit" : "🔓 Lock rate card";
  $("rateCardPanel").classList.toggle("rates-unlocked", !locked);
  updateRateUi();
}

$("btnUnlockRates").addEventListener("click", () => {
  if (ratesLocked) {
    const ok = window.confirm(
      "⚠ Unlock the rate card?\n\n" +
      "These numbers are Microsoft's published Copilot Credit rates. Editing them changes every " +
      "calculation on this page, and exported reports will be flagged as using CUSTOM rates.\n\n" +
      "Only continue if the published rates have actually changed (verify against the current " +
      "Copilot Studio Licensing Guide)."
    );
    if (!ok) return;
    setRatesLocked(false);
    toast("🔓 Rate card unlocked — edit with care");
  } else {
    setRatesLocked(true);
    toast("🔒 Rate card locked");
  }
});

$("btnResetRates").addEventListener("click", () => {
  Object.assign(state, RATE_DEFAULTS, MID_DEFAULTS);
  syncNumInputs();
  recalc();
  toast("↺ Rate card reset to Microsoft list rates");
});

function updateRateUi() {
  const custom = ratesCustom();
  $("ratesWarn").hidden = !custom;
  $("btnResetRates").hidden = ratesLocked && !custom;
  // keep the per-feature labels in the Standard panel in sync with the live rate card
  $("emClassic").textContent = state.rClassic + " cr";
  $("emGen").textContent = state.rGen + " cr";
  $("emActions").textContent = state.rActions + " cr";
  $("emGraph").textContent = state.rGraph + " cr";
  $("emFlow").textContent = state.rFlow + " cr / 100";
  $("emPages").textContent = state.rPages + " cr / page";
  $("emReason").textContent = "+" + state.rReason + " cr / 1K";
}

/* ---------- rendering ---------- */
function pulse(el) { el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }

function recalc() {
  const c = compute(state);
  const heavy = Math.max(0, 100 - state.gLight - state.gMedium);
  $("gHeavy").textContent = heavy + "%";

  $("volumeNote").textContent =
    `${fmtInt(c.totalSessions)} sessions/month · ${fmtInt(licensedUsers(state))} of ${fmtInt(state.users)} users are M365 Copilot licensed (their Standard-harness B2E usage bills $0 — GitHub Copilot harness bills everyone).`;

  $("stdPerSession").textContent = fmtCr(c.stdPerSess);
  $("stdMonthly").textContent = fmtCr(c.stdBillableCredits);
  $("stdFreeCredits").textContent = fmtCr(c.stdFreeCredits);
  $("ghcpPerSession").textContent = fmtCr(c.ghcpPerTask);
  $("ghcpMonthly").textContent = fmtCr(c.ghcpRuntimeCredits);
  $("ghcpDev").textContent = fmtCr(c.ghcpDevCredits);

  const stdCost = c.stdBuy.cost, ghcpCost = c.ghcpBuy.cost;
  const vs = $("vStdCost"), vg = $("vGhcpCost");
  vs.textContent = fmtMoney(stdCost); pulse(vs);
  vg.textContent = fmtMoney(ghcpCost); pulse(vg);
  $("vStdCredits").textContent = fmtCr(c.stdBillableCredits);
  $("vGhcpCredits").textContent = fmtCr(c.ghcpTotalCredits);
  $("vStdPerSess").textContent = c.totalSessions ? fmtMoney(stdCost / c.totalSessions) : "$0";
  $("vGhcpPerSess").textContent = c.totalSessions ? fmtMoney(ghcpCost / c.totalSessions) : "$0";
  $("vStdBuy").textContent = buyLabel(c.stdBuy);
  $("vGhcpBuy").textContent = buyLabel(c.ghcpBuy);
  $("vStdSaved").textContent = fmtMoney(c.stdFreeCredits * c.paygRate);
  $("vGhcpDevShare").textContent = c.ghcpTotalCredits ? Math.round(100 * c.ghcpDevCredits / c.ghcpTotalCredits) + "%" : "0%";

  // delta ring
  const ratio = stdCost > 0 ? ghcpCost / stdCost : (ghcpCost > 0 ? Infinity : 1);
  const dx = $("deltaX");
  if (!isFinite(ratio)) { dx.textContent = "∞×"; }
  else if (ratio >= 1) { dx.textContent = ratio >= 100 ? Math.round(ratio) + "×" : ratio.toFixed(1) + "×"; }
  else { dx.textContent = (1 / Math.max(ratio, 1e-9)).toFixed(1) + "×"; }
  $("deltaCaption").textContent = ratio >= 1 ? "GHCP costs more" : "Standard costs more";
  const circumference = 2 * Math.PI * 86;
  const frac = isFinite(ratio) ? Math.min(1, Math.log10(Math.max(ratio, 1)) / 2.5) : 1; // log scale to 300×
  $("ringFg").style.strokeDasharray = circumference;
  $("ringFg").style.strokeDashoffset = circumference * (1 - Math.max(frac, 0.02));

  $("verdictNote").textContent = verdictText(c, ratio);

  updateRateUi();
  drawComposition(c);
  drawScaleChart(c);
  drawPhaseChart(c);
  renderPackOpt(c);
  saveHash();
}

function buyLabel(buy) {
  if (buy.credits === 0) return "—";
  if (buy.packs === 0) return "PAYG only";
  const o = buy.overflow > 0 ? ` + ${fmtCr(buy.overflow)} PAYG` : "";
  return `${buy.packs} pack${buy.packs > 1 ? "s" : ""}${o}`;
}

function verdictText(c, ratio) {
  if (c.totalSessions === 0) return "Add some volume to see a verdict.";
  if (!isFinite(ratio) || ratio > 20)
    return "At this profile the GitHub Copilot harness is a price class apart. Reserve it for tasks that genuinely need agentic reasoning, file generation or self-recovery.";
  if (ratio > 3)
    return "GHCP is significantly pricier per run — worth it only where the Standard harness architecturally can't deliver the outcome.";
  if (ratio >= 0.8)
    return "Costs are in the same ballpark here — pick the harness on capability fit, not price.";
  return "Unusual: your Standard mix (reasoning tokens / graph grounding / pages) is heavy enough that GHCP is competitive or cheaper.";
}

/* ---------- canvas helpers ---------- */
function setupCanvas(cv) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 640, h = w * 0.5625;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
const COLORS = {
  std: "#38bdf8", ghcp: "#c084fc", ghcpDev: "#e9d5ff", muted: "#8b94b8", line: "#1d2547", ok: "#34d399",
  palette: ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#f472b6", "#22d3ee", "#facc15"],
};
function fontPx(px) { return `${px}px "JetBrains Mono", monospace`; }

/* composition: horizontal stacked bars for both harnesses */
function drawComposition(c) {
  const { ctx, w, h } = setupCanvas($("chartComp"));
  const s = state;
  const stdParts = [
    ["Classic", s.sClassic * s.rClassic], ["Generative", s.sGen * s.rGen], ["Actions", s.sActions * s.rActions],
    ["Graph", s.sGraph * s.rGraph], ["Flows", s.sFlow * s.rFlow / 100], ["AI tools", s.sTokens * s.sTier],
    ["Reasoning", s.sReason * s.rReason], ["Pages", s.sPages * s.rPages],
  ].filter(p => p[1] > 0);
  const heavy = Math.max(0, 100 - s.gLight - s.gMedium);
  const perTask = ghcpPerTaskCredits(s);
  const ghcpParts = [
    ["Light", s.gLight * s.gLightMid / 100], ["Medium", s.gMedium * s.gMediumMid / 100], ["Heavy", heavy * s.gHeavyMid / 100],
  ].filter(p => p[1] > 0);

  const rows = [
    { label: "🧱 Std / session", parts: stdParts, total: stdPerSessionCredits(s), color: COLORS.std },
    { label: "🐙 GHCP / task", parts: ghcpParts, total: perTask, color: COLORS.ghcp },
  ];
  const maxT = Math.max(...rows.map(r => r.total), 1);
  const barH = 42, x0 = 12, x1 = w - 12, top = 34;

  rows.forEach((row, i) => {
    const y = top + i * (barH + 74);
    ctx.font = fontPx(12); ctx.fillStyle = COLORS.muted; ctx.textAlign = "left";
    ctx.fillText(row.label + " — " + fmtCr(row.total) + " credits", x0, y - 10);
    let x = x0;
    const scale = (x1 - x0) / maxT;
    row.parts.forEach((p, j) => {
      const bw = p[1] * scale;
      ctx.fillStyle = i === 0 ? COLORS.palette[j % COLORS.palette.length] : ["#e9d5ff", "#c084fc", "#7e22ce"][j % 3];
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(bw - 2, 1), barH, 4);
      ctx.fill();
      x += bw;
    });
    if (row.parts.length === 0) {
      ctx.fillStyle = COLORS.line;
      ctx.beginPath(); ctx.roundRect(x0, y, 60, barH, 4); ctx.fill();
      ctx.fillStyle = COLORS.muted; ctx.fillText("empty", x0 + 8, y + 26);
    }
    // legend
    ctx.font = fontPx(10.5);
    let lx = x0, ly = y + barH + 18;
    row.parts.forEach((p, j) => {
      const sw = ctx.measureText(p[0] + " " + fmtCr(p[1])).width + 26;
      if (lx + sw > x1) { lx = x0; ly += 16; }
      ctx.fillStyle = i === 0 ? COLORS.palette[j % COLORS.palette.length] : ["#e9d5ff", "#c084fc", "#7e22ce"][j % 3];
      ctx.fillRect(lx, ly - 8, 9, 9);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`${p[0]} ${fmtCr(p[1])}`, lx + 13, ly);
      lx += sw;
    });
  });
}

/* scaling line chart: cost vs monthly sessions */
function drawScaleChart(c) {
  const { ctx, w, h } = setupCanvas($("chartScale"));
  const pad = { l: 58, r: 16, t: 14, b: 34 };
  const maxSess = Math.max(c.totalSessions * 2.5, 1000);
  const N = 60;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const sess = maxSess * i / N;
    const stdCredits = c.stdPerSess * sess * c.unlicensedShare;
    const ghcpCredits = c.ghcpPerTask * sess + c.ghcpDevCredits;
    pts.push({
      sess,
      std: bestBuy(stdCredits, c.paygRate, c.packPrice).cost,
      ghcp: bestBuy(ghcpCredits, c.paygRate, c.packPrice).cost,
    });
  }
  const maxY = Math.max(...pts.map(p => Math.max(p.std, p.ghcp)), 10);
  const X = s => pad.l + (w - pad.l - pad.r) * s / maxSess;
  const Y = v => h - pad.b - (h - pad.t - pad.b) * v / maxY;

  // grid + axes
  ctx.strokeStyle = COLORS.line; ctx.fillStyle = COLORS.muted; ctx.font = fontPx(10); ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const v = maxY * g / 4, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(fmtMoney(v), pad.l - 6, y + 3);
  }
  for (let g = 0; g <= 4; g++) {
    const sess = maxSess * g / 4;
    ctx.textAlign = "center"; ctx.fillText(fmtCr(sess), X(sess), h - pad.b + 16);
  }

  const line = (key, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2.4;
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(X(p.sess), Y(p[key])) : ctx.moveTo(X(p.sess), Y(p[key])));
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  line("std", COLORS.std);
  line("ghcp", COLORS.ghcp);

  // current volume markers
  const cur = c.totalSessions;
  if (cur > 0 && cur <= maxSess) {
    const mark = (v, color) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(X(cur), Y(v), 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    };
    mark(c.stdBuy.cost, COLORS.std);
    mark(c.ghcpBuy.cost, COLORS.ghcp);
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(cur), pad.t); ctx.lineTo(X(cur), h - pad.b); ctx.stroke();
    ctx.setLineDash([]);
  }
  // legend
  ctx.font = fontPx(11); ctx.textAlign = "left";
  ctx.fillStyle = COLORS.std; ctx.fillText("● Standard", pad.l + 8, pad.t + 10);
  ctx.fillStyle = COLORS.ghcp; ctx.fillText("● GitHub Copilot", pad.l + 96, pad.t + 10);
}

/* build phase vs steady state: what a dev/test month costs vs a
   typical production month, per harness. Standard authoring is free
   until publish; GHCP meters development from the first build action
   and keeps burning maker test credits after launch. */
function drawPhaseChart(c) {
  const { ctx, w, h } = setupCanvas($("chartPhase"));
  const pad = { l: 58, r: 16, t: 30, b: 48 };

  const buildStd = 0; // Standard harness: authoring, previewing and testing are free until publish
  const buildGhcp = bestBuy(c.ghcpDevCredits, c.paygRate, c.packPrice).cost;
  const steadyStd = c.stdBuy.cost;
  const steadyGhcp = c.ghcpBuy.cost;
  const devShare = c.ghcpTotalCredits > 0 ? c.ghcpDevCredits / c.ghcpTotalCredits : 0;

  const maxY = Math.max(buildGhcp, steadyStd, steadyGhcp, 10);
  const Y = v => h - pad.b - (h - pad.t - pad.b) * v / maxY;

  // grid
  ctx.strokeStyle = COLORS.line; ctx.fillStyle = COLORS.muted; ctx.font = fontPx(10); ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const v = maxY * g / 4, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(fmtMoney(v), pad.l - 6, y + 3);
  }

  const groups = [
    { label: "🛠 Dev / test month", sub: "before launch", std: buildStd, ghcp: buildGhcp, devFrac: buildGhcp > 0 ? 1 : 0 },
    { label: "🚀 Steady-state month", sub: "in production", std: steadyStd, ghcp: steadyGhcp, devFrac: devShare },
  ];
  const groupW = (w - pad.l - pad.r) / groups.length;
  const barW = Math.min(64, groupW * 0.28);

  groups.forEach((g, gi) => {
    const cx = pad.l + groupW * gi + groupW / 2;
    const bars = [
      { x: cx - barW - 8, v: g.std, color: COLORS.std, devFrac: 0, zero: "$0 · free to build" },
      { x: cx + 8, v: g.ghcp, color: COLORS.ghcp, devFrac: g.devFrac, zero: "$0" },
    ];
    bars.forEach(b => {
      const y = Y(b.v), bh = h - pad.b - y;
      if (b.v > 0 && bh > 0.5) {
        const devH = bh * b.devFrac;
        // runtime portion
        if (bh - devH > 0.5) {
          ctx.fillStyle = b.color;
          ctx.beginPath(); ctx.roundRect(b.x, y + devH, barW, bh - devH, 4); ctx.fill();
        }
        // dev-burn portion on top (lighter)
        if (devH > 0.5) {
          ctx.fillStyle = COLORS.ghcpDev;
          ctx.beginPath(); ctx.roundRect(b.x, y, barW, devH, 4); ctx.fill();
        }
      } else {
        // zero bar: draw a baseline stub so it reads as "measured, and it's $0"
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, h - pad.b - 2, barW, 2);
      }
      ctx.font = fontPx(10.5); ctx.textAlign = "center";
      ctx.fillStyle = b.v > 0 ? "#fff" : COLORS.ok;
      ctx.fillText(b.v > 0 ? fmtMoney(b.v) : b.zero, b.x + barW / 2, Y(b.v) - 6);
    });
    ctx.fillStyle = COLORS.muted; ctx.font = fontPx(11); ctx.textAlign = "center";
    ctx.fillText(g.label, cx, h - pad.b + 18);
    ctx.font = fontPx(9.5);
    ctx.fillText(g.sub, cx, h - pad.b + 32);
  });

  // legend
  ctx.font = fontPx(10.5); ctx.textAlign = "left";
  ctx.fillStyle = COLORS.std; ctx.fillText("● Standard", pad.l + 8, 12);
  ctx.fillStyle = COLORS.ghcp; ctx.fillText("● GitHub Copilot runtime", pad.l + 92, 12);
  ctx.fillStyle = COLORS.ghcpDev; ctx.fillText("● GHCP dev burn", pad.l + 280, 12);
}

/* pack optimizer panel */
function renderPackOpt(c) {
  const el = $("packOpt");
  const block = (name, cls, buy) => {
    const packCost = buy.packs * c.packPrice;
    const overflowCost = buy.overflow * c.paygRate;
    return `<div class="pack-line">
      <h4 class="${cls}">${name}</h4>
      <div class="pack-detail">
        need <b>${fmtCr(buy.credits)}</b> credits/mo<br>
        ${buy.packs > 0
          ? `<b>${buy.packs}</b> × 25K pack${buy.packs > 1 ? "s" : ""} (${fmtMoney(packCost)}) + <b>${fmtCr(buy.overflow)}</b> credits PAYG (${fmtMoney(overflowCost)})`
          : `pure PAYG — packs don't pay off below ~${fmtCr(c.packPrice / c.paygRate)} credits`}
        <br>total <b>${fmtMoney(buy.cost)}</b>/mo
        ${buy.savings > 0.5 ? ` · <span class="pack-save">saves ${fmtMoney(buy.savings)} vs PAYG-only</span>` : ""}
      </div>
      ${buy.overageRisk ? `<div class="pack-warn">⚠ Consumption exceeds 125% of prepaid pack capacity — overage enforcement can disable agents. Add a pack or enable PAYG overflow.</div>` : ""}
    </div>`;
  };
  el.innerHTML = block("🧱 Standard harness", "std-c", c.stdBuy) + block("🐙 GitHub Copilot harness", "ghcp-c", c.ghcpBuy);
}

/* ---------- share ---------- */
const HASH_KEYS = Object.keys(state);
function saveHash() {
  const params = new URLSearchParams();
  HASH_KEYS.forEach(k => params.set(k, state[k]));
  history.replaceState(null, "", "#" + params.toString());
}
function loadHash() {
  if (!location.hash || location.hash.length < 2) return false;
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    let found = false;
    HASH_KEYS.forEach(k => {
      if (params.has(k)) { state[k] = +params.get(k); found = true; }
    });
    if (found) applyPreset({ ...state });
    return found;
  } catch { return false; }
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

$("btnShare").addEventListener("click", async () => {
  saveHash();
  try {
    await navigator.clipboard.writeText(location.href);
    toast("✓ Scenario link copied");
  } catch {
    toast("Copy failed — grab the URL from the address bar");
  }
});

/* ---------- report export: copy as Markdown ---------- */
const TIER_NAMES = { 0.1: "Basic (0.1 cr/1K tok)", 1.5: "Standard (1.5 cr/1K tok)", 10: "Premium (10 cr/1K tok)" };

function reportModel() {
  const c = compute(state);
  const s = state;
  const heavy = Math.max(0, 100 - s.gLight - s.gMedium);
  const ratio = c.stdBuy.cost > 0 ? c.ghcpBuy.cost / c.stdBuy.cost : (c.ghcpBuy.cost > 0 ? Infinity : 1);
  const ratioLabel = !isFinite(ratio) ? "∞×"
    : ratio >= 1 ? (ratio >= 100 ? Math.round(ratio) + "× (GHCP costs more)" : ratio.toFixed(1) + "× (GHCP costs more)")
    : (1 / Math.max(ratio, 1e-9)).toFixed(1) + "× (Standard costs more)";
  return {
    title: "Copilot Studio Credit Estimate",
    subtitle: "Standard harness vs GitHub Copilot harness — monthly planning estimate",
    generated: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    link: location.href,
    ratioLabel,
    verdict: verdictText(c, ratio),
    comparison: [
      ["Monthly sessions / tasks", fmtInt(c.totalSessions), fmtInt(c.totalSessions)],
      ["Credits per session / task", fmtCr(c.stdPerSess), fmtCr(c.ghcpPerTask) + " (weighted)"],
      ["Billable credits / month", fmtCr(c.stdBillableCredits), fmtCr(c.ghcpTotalCredits)],
      ["Credits absorbed by M365 licenses", fmtCr(c.stdFreeCredits), "— (no inclusion)"],
      ["Development-burn credits / month", "— (free until publish)", fmtCr(c.ghcpDevCredits)],
      ["Best procurement", buyLabel(c.stdBuy), buyLabel(c.ghcpBuy)],
      ["Cost per session / task", c.totalSessions ? fmtMoney(c.stdBuy.cost / c.totalSessions) : "$0", c.totalSessions ? fmtMoney(c.ghcpBuy.cost / c.totalSessions) : "$0"],
      ["Monthly cost", fmtMoney(c.stdBuy.cost), fmtMoney(c.ghcpBuy.cost)],
    ],
    assumptions: [
      ["Active users / callers", fmtInt(s.users)],
      ["Sessions per user / month", fmtInt(s.sessions)],
      ["Users with M365 Copilot license", `${fmtInt(licensedUsers(s))} of ${fmtInt(s.users)}`],
      ["Std per-session mix: classic / generative / actions / graph", `${s.sClassic} / ${s.sGen} / ${s.sActions} / ${s.sGraph}`],
      ["Std: agent flow actions per session", fmtInt(s.sFlow)],
      ["Std: AI-tool tokens per session", `${s.sTokens}K @ ${TIER_NAMES[s.sTier] || s.sTier + " cr/1K tok"}`],
      ["Std: reasoning tokens / content pages per session", `${s.sReason}K / ${s.sPages}`],
      ["GHCP task mix: light / medium / heavy", `${s.gLight}% / ${s.gMedium}% / ${heavy}%`],
      ["GHCP tier midpoints: light / medium / heavy", `${s.gLightMid} / ${s.gMediumMid} / ${s.gHeavyMid} cr`],
      ["GHCP development burn", `${s.gMakers} maker${s.gMakers === 1 ? "" : "s"} × ${s.gTestRuns} test runs × ${s.gTestCr} cr`],
      ["Pricing", `PAYG $${s.pPayg}/credit · pack $${s.pPack}/25K credits · ${s.pDisc}% discount`],
      ["Rate card", ratesCustom()
        ? `⚠ CUSTOM — classic ${s.rClassic} / generative ${s.rGen} / action ${s.rActions} / graph ${s.rGraph} / flow ${s.rFlow}/100 / page ${s.rPages} / reasoning ${s.rReason}/1K`
        : "Microsoft list rates (Aug 2026)"],
    ],
    disclaimer: "Planning estimate only — not a billing commitment. Verify rates against the current Microsoft Copilot Studio Licensing Guide.",
  };
}

/* Markdown report — pastes cleanly into email, Teams, docs, GitHub */
function reportMarkdown() {
  const r = reportModel();
  const lines = [];
  lines.push(`# ${r.title}`);
  lines.push("");
  lines.push(`${r.subtitle}`);
  lines.push(`Generated: ${r.generated}`);
  lines.push("");
  lines.push("## Comparison");
  lines.push("");
  lines.push("| | Standard harness | GitHub Copilot harness |");
  lines.push("|---|---|---|");
  r.comparison.forEach(row => lines.push(`| ${row[0]} | ${row[1]} | ${row[2]} |`));
  lines.push("");
  lines.push(`**Cost multiple:** ${r.ratioLabel}`);
  lines.push("");
  lines.push(`**Verdict:** ${r.verdict}`);
  lines.push("");
  lines.push("## Assumptions");
  lines.push("");
  lines.push("| Input | Value |");
  lines.push("|---|---|");
  r.assumptions.forEach(row => lines.push(`| ${row[0]} | ${row[1]} |`));
  lines.push("");
  lines.push(`Scenario link: ${r.link}`);
  lines.push("");
  lines.push(`> ${r.disclaimer}`);
  lines.push("");
  return lines.join("\n");
}

function downloadFile(content, type, name) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

$("btnCopy").addEventListener("click", async () => {
  saveHash();
  const md = reportMarkdown();
  try {
    await navigator.clipboard.writeText(md);
    toast("✓ Markdown copied — paste anywhere");
  } catch {
    // clipboard unavailable (permissions / non-secure context) — download instead
    downloadFile(md, "text/markdown", "copilot-studio-estimate.md");
    toast("Clipboard unavailable — report downloaded as Markdown");
  }
});

/* roundRect polyfill for older browsers */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

/* ---------- init ---------- */
window.addEventListener("resize", () => recalc());
setRatesLocked(true);
if (!loadHash()) applyPreset({ ...PRESETS.employee });
})();
