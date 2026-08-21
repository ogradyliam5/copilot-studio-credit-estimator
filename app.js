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

/* ---------- state ---------- */
const state = {
  users: 500, sessions: 12, m365: 20,
  sClassic: 2, sGen: 3, sActions: 2, sGraph: 1, sFlow: 0,
  sTokens: 0, sTier: 1.5, sReason: 0, sPages: 0,
  gLight: 70, gMedium: 25,
  gLightMid: 200, gMediumMid: 400, gHeavyMid: 700,
  gMakers: 2, gTestRuns: 60, gTestCr: 150,
  pPayg: 0.01, pPack: 200, pDisc: 0,
};

const PRESETS = {
  faq:        { users: 2000, sessions: 8,  m365: 0,  sClassic: 5, sGen: 1, sActions: 0, sGraph: 0, sFlow: 0, sTokens: 0, sTier: 0.1, sReason: 0, sPages: 0, gLight: 95, gMedium: 5,  gMakers: 1, gTestRuns: 30,  gTestCr: 120 },
  support:    { users: 900,  sessions: 15, m365: 0,  sClassic: 2, sGen: 4, sActions: 2, sGraph: 0, sFlow: 20, sTokens: 2, sTier: 1.5, sReason: 0, sPages: 0, gLight: 70, gMedium: 25, gMakers: 2, gTestRuns: 60,  gTestCr: 150 },
  employee:   { users: 500,  sessions: 12, m365: 40, sClassic: 1, sGen: 4, sActions: 2, sGraph: 3, sFlow: 0,  sTokens: 0, sTier: 1.5, sReason: 0, sPages: 0, gLight: 60, gMedium: 30, gMakers: 2, gTestRuns: 60,  gTestCr: 150 },
  autonomous: { users: 1,    sessions: 3000, m365: 0, sClassic: 0, sGen: 1, sActions: 4, sGraph: 0, sFlow: 60, sTokens: 1, sTier: 1.5, sReason: 0, sPages: 2, gLight: 40, gMedium: 45, gMakers: 2, gTestRuns: 80, gTestCr: 200 },
  frontier:   { users: 200,  sessions: 20, m365: 30, sClassic: 0, sGen: 4, sActions: 5, sGraph: 2, sFlow: 0,  sTokens: 4, sTier: 10, sReason: 8, sPages: 3, gLight: 20, gMedium: 45, gMakers: 3, gTestRuns: 120, gTestCr: 300 },
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
  return s.sClassic * 1
       + s.sGen * 2
       + s.sActions * 5
       + s.sGraph * 10
       + s.sFlow * 13 / 100
       + s.sTokens * s.sTier
       + s.sReason * 10
       + s.sPages * 8;
}

function ghcpPerTaskCredits(s) {
  const heavy = Math.max(0, 100 - s.gLight - s.gMedium);
  return (s.gLight * s.gLightMid + s.gMedium * s.gMediumMid + heavy * s.gHeavyMid) / 100;
}

function compute(s) {
  const totalSessions = s.users * s.sessions;
  const unlicensedShare = 1 - s.m365 / 100;

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
    totalSessions, stdPerSess, stdTotalCredits, stdBillableCredits, stdFreeCredits,
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
function bindNum(numId, key) {
  const n = $(numId);
  n.addEventListener("input", () => { state[key] = +n.value || 0; recalc(); });
}

const setters = {};
setters.users    = bindPair("inUsers", "inUsersN", "users");
setters.sessions = bindPair("inSessions", "inSessionsN", "sessions");
setters.m365     = bindPair("inM365", "inM365N", "m365");
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
bindNum("gLightMid", "gLightMid");
bindNum("gMediumMid", "gMediumMid");
bindNum("gHeavyMid", "gHeavyMid");
bindNum("pPayg", "pPayg");
bindNum("pPack", "pPack");

function clampMix() {
  if (state.gLight + state.gMedium > 100) {
    state.gMedium = 100 - state.gLight;
    $("gMedium").value = state.gMedium;
    $("gMediumN").value = state.gMedium;
  }
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
  for (const [k, set] of Object.entries(setters)) if (k in p) {
    // update inputs without recursive recalc storms — setters call recalc anyway
    const rid = { users: "inUsers", sessions: "inSessions", m365: "inM365" }[k];
    const r = $(rid || k), n = $((rid || k) + "N");
    if (r) r.value = Math.min(+r.max, p[k]);
    if (n) n.value = p[k];
  }
  // tier segmented control
  [...$("sTier").children].forEach(x => x.classList.toggle("active", +x.dataset.v === state.sTier));
  recalc();
}

/* ---------- rendering ---------- */
function pulse(el) { el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }

function recalc() {
  const c = compute(state);
  const heavy = Math.max(0, 100 - state.gLight - state.gMedium);
  $("gHeavy").textContent = heavy + "%";

  $("volumeNote").textContent =
    `${fmtInt(c.totalSessions)} sessions/month · ${fmtInt(Math.round(state.users * state.m365 / 100))} of ${fmtInt(state.users)} users are M365 Copilot licensed (their Standard-harness B2E usage bills $0 — GitHub Copilot harness bills everyone).`;

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

  drawComposition(c);
  drawScaleChart(c);
  drawYearChart(c);
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
  std: "#38bdf8", ghcp: "#c084fc", muted: "#8b94b8", line: "#1d2547",
  palette: ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#f472b6", "#22d3ee", "#facc15"],
};
function fontPx(px) { return `${px}px "JetBrains Mono", monospace`; }

/* composition: horizontal stacked bars for both harnesses */
function drawComposition(c) {
  const { ctx, w, h } = setupCanvas($("chartComp"));
  const s = state;
  const stdParts = [
    ["Classic", s.sClassic * 1], ["Generative", s.sGen * 2], ["Actions", s.sActions * 5],
    ["Graph", s.sGraph * 10], ["Flows", s.sFlow * 13 / 100], ["AI tools", s.sTokens * s.sTier],
    ["Reasoning", s.sReason * 10], ["Pages", s.sPages * 8],
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
    const stdCredits = c.stdPerSess * sess * (1 - state.m365 / 100);
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

/* 12-month cumulative projection */
function drawYearChart(c) {
  const { ctx, w, h } = setupCanvas($("chartYear"));
  const pad = { l: 58, r: 16, t: 14, b: 34 };
  const months = [...Array(12).keys()];
  let stdCum = 0, ghcpCum = 0;
  const rows = months.map(m => {
    stdCum += c.stdBuy.cost;
    // dev burn 2x during first 3 months (build phase)
    const devMult = m < 3 ? 2 : 1;
    const ghcpCredits = c.ghcpRuntimeCredits + c.ghcpDevCredits * devMult;
    ghcpCum += bestBuy(ghcpCredits, c.paygRate, c.packPrice).cost;
    return { std: stdCum, ghcp: ghcpCum };
  });
  const maxY = Math.max(rows[11].std, rows[11].ghcp, 10);
  const X = m => pad.l + (w - pad.l - pad.r) * m / 11;
  const Y = v => h - pad.b - (h - pad.t - pad.b) * v / maxY;

  ctx.strokeStyle = COLORS.line; ctx.fillStyle = COLORS.muted; ctx.font = fontPx(10); ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const v = maxY * g / 4, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(fmtMoney(v), pad.l - 6, y + 3);
  }
  months.forEach(m => {
    if (m % 2 === 0) { ctx.textAlign = "center"; ctx.fillText("M" + (m + 1), X(m), h - pad.b + 16); }
  });

  const area = (key, color, fill) => {
    ctx.beginPath();
    rows.forEach((r, i) => i ? ctx.lineTo(X(i), Y(r[key])) : ctx.moveTo(X(0), Y(r[key])));
    ctx.lineTo(X(11), h - pad.b); ctx.lineTo(X(0), h - pad.b); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2.4;
    ctx.beginPath();
    rows.forEach((r, i) => i ? ctx.lineTo(X(i), Y(r[key])) : ctx.moveTo(X(0), Y(r[key])));
    ctx.stroke();
  };
  area("ghcp", COLORS.ghcp, "rgba(192,132,252,.10)");
  area("std", COLORS.std, "rgba(56,189,248,.10)");

  ctx.font = fontPx(11); ctx.textAlign = "left";
  ctx.fillStyle = COLORS.std; ctx.fillText("● Std yr1: " + fmtMoney(rows[11].std), pad.l + 8, pad.t + 10);
  ctx.fillStyle = COLORS.ghcp; ctx.fillText("● GHCP yr1: " + fmtMoney(rows[11].ghcp), pad.l + 160, pad.t + 10);
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

/* ---------- share / export ---------- */
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

$("btnExport").addEventListener("click", () => {
  const c = compute(state);
  const out = {
    generated: new Date().toISOString(),
    inputs: { ...state },
    results: {
      totalSessionsPerMonth: c.totalSessions,
      standardHarness: {
        creditsPerSession: c.stdPerSess,
        billableCreditsPerMonth: Math.round(c.stdBillableCredits),
        creditsAbsorbedByM365Licenses: Math.round(c.stdFreeCredits),
        monthlyCostUSD: +c.stdBuy.cost.toFixed(2),
        procurement: buyLabel(c.stdBuy),
      },
      githubCopilotHarness: {
        creditsPerTaskWeighted: c.ghcpPerTask,
        runtimeCreditsPerMonth: Math.round(c.ghcpRuntimeCredits),
        devBurnCreditsPerMonth: Math.round(c.ghcpDevCredits),
        monthlyCostUSD: +c.ghcpBuy.cost.toFixed(2),
        procurement: buyLabel(c.ghcpBuy),
      },
    },
    disclaimer: "Planning estimate only, not a billing commitment. Verify rates against the current Microsoft Copilot Studio Licensing Guide.",
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "copilot-studio-estimate.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("✓ Estimate exported");
});

/* ---------- report export: PDF + copy/paste ---------- */
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
      ["Users with M365 Copilot license", s.m365 + "%"],
      ["Std per-session mix: classic / generative / actions / graph", `${s.sClassic} / ${s.sGen} / ${s.sActions} / ${s.sGraph}`],
      ["Std: agent flow actions per session", fmtInt(s.sFlow)],
      ["Std: AI-tool tokens per session", `${s.sTokens}K @ ${TIER_NAMES[s.sTier] || s.sTier + " cr/1K tok"}`],
      ["Std: reasoning tokens / content pages per session", `${s.sReason}K / ${s.sPages}`],
      ["GHCP task mix: light / medium / heavy", `${s.gLight}% / ${s.gMedium}% / ${heavy}%`],
      ["GHCP tier midpoints: light / medium / heavy", `${s.gLightMid} / ${s.gMediumMid} / ${s.gHeavyMid} cr`],
      ["GHCP development burn", `${s.gMakers} maker${s.gMakers === 1 ? "" : "s"} × ${s.gTestRuns} test runs × ${s.gTestCr} cr`],
      ["Pricing", `PAYG $${s.pPayg}/credit · pack $${s.pPack}/25K credits · ${s.pDisc}% discount`],
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

const escHtml = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Self-contained, print-optimized HTML report */
function reportHtml() {
  const r = reportModel();
  const tableRows = (rows, head) => `
    <table>
      <thead><tr>${head.map(h => `<th>${escHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map((cell, i) => i === 0 ? `<th scope="row">${escHtml(cell)}</th>` : `<td>${escHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escHtml(r.title)}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font: 13px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1f36; margin: 32px auto; max-width: 760px; padding: 0 16px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  h2 { font-size: 15px; margin: 26px 0 8px; border-bottom: 2px solid #e2e6f0; padding-bottom: 4px; }
  .sub { color: #5a6379; margin: 0 0 2px; }
  .meta { color: #8a91a5; font-size: 11.5px; margin: 0 0 6px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  th, td { border: 1px solid #d7dce8; padding: 6px 10px; text-align: left; vertical-align: top; }
  thead th { background: #f1f4fa; font-size: 12px; }
  tbody th[scope="row"] { font-weight: 600; background: #fafbfe; width: 44%; }
  tr.total th, tr.total td { font-weight: 700; background: #eef6ff; }
  .verdict { background: #f6f8fc; border-left: 4px solid #4f7cff; padding: 10px 14px; margin: 12px 0; }
  .disclaimer { color: #8a91a5; font-size: 11px; margin-top: 22px; border-top: 1px solid #e2e6f0; padding-top: 10px; }
  a { color: #2b5fd9; word-break: break-all; }
  .noprint { margin: 14px 0; }
  .noprint button { font: inherit; padding: 8px 16px; cursor: pointer; }
  @media print { .noprint { display: none; } body { margin: 0; } }
</style>
</head>
<body>
<h1>${escHtml(r.title)}</h1>
<p class="sub">${escHtml(r.subtitle)}</p>
<p class="meta">Generated ${escHtml(r.generated)}</p>
<div class="noprint"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
<h2>Comparison</h2>
${tableRows(r.comparison, ["", "🧱 Standard harness", "🐙 GitHub Copilot harness"]).replace(/<tr><th scope="row">Monthly cost/, '<tr class="total"><th scope="row">Monthly cost')}
<p><b>Cost multiple:</b> ${escHtml(r.ratioLabel)}</p>
<div class="verdict"><b>Verdict:</b> ${escHtml(r.verdict)}</div>
<h2>Assumptions</h2>
${tableRows(r.assumptions, ["Input", "Value"])}
<h2>Scenario link</h2>
<p><a href="${escHtml(r.link)}">${escHtml(r.link)}</a></p>
<p class="disclaimer">${escHtml(r.disclaimer)}</p>
<script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));<\/script>
</body>
</html>`;
}

$("btnPdf").addEventListener("click", () => {
  saveHash();
  const w = window.open("", "_blank", "noopener");
  if (!w) { toast("Pop-up blocked — allow pop-ups to export the PDF report"); return; }
  w.document.open();
  w.document.write(reportHtml());
  w.document.close();
  toast("✓ Report opened — use Print → Save as PDF");
});

$("btnCopy").addEventListener("click", async () => {
  saveHash();
  const md = reportMarkdown();
  try {
    await navigator.clipboard.writeText(md);
    toast("✓ Report copied — paste anywhere (Markdown)");
  } catch {
    // clipboard unavailable (permissions / non-secure context) — download instead
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "copilot-studio-estimate.md";
    a.click();
    URL.revokeObjectURL(a.href);
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
if (!loadHash()) applyPreset({ ...PRESETS.employee });
})();
