/* Headless smoke test: stub the DOM, load app.js, verify calculations render.
   Run: node smoke-test.js */
"use strict";
const fs = require("fs");

const ids = new Map();
function makeCtx() {
  return new Proxy({}, { get: (t, p) => {
    if (p === "measureText") return () => ({ width: 40 });
    if (typeof p === "string") return (..._a) => {};
    return undefined;
  }, set: () => true });
}
function makeEl(id) {
  const listeners = {};
  const el = {
    id, value: "0", min: "0", max: "100000", textContent: "", innerHTML: "",
    className: "", dataset: {}, style: {}, children: [],
    clientWidth: 640, width: 640, height: 360, offsetWidth: 640,
    disabled: false, hidden: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    dispatch(ev, e) { return (listeners[ev] || []).map(f => f(e || { target: el })); },
    getContext: () => makeCtx(),
    closest: () => null,
    querySelectorAll: () => [],
    setAttribute() {}, appendChild() {}, click() {},
  };
  return el;
}
global.document = {
  getElementById(id) { if (!ids.has(id)) ids.set(id, makeEl(id)); return ids.get(id); },
  querySelectorAll: () => [],
  createElement: id => makeEl(id),
};
let openedReportHtml = null;
let confirmCalls = 0;
global.window = {
  addEventListener() {}, devicePixelRatio: 1,
  confirm: () => { confirmCalls++; return true; },
  open: () => ({ document: { open() {}, write(html) { openedReportHtml = html; }, close() {} } }),
};
global.history = { replaceState() {} };
global.location = { hash: "", href: "http://x/" };
let copiedText = null;
Object.defineProperty(global, "navigator", { value: { clipboard: { writeText: async t => { copiedText = t; } } }, configurable: true });
global.CanvasRenderingContext2D = function () {};
CanvasRenderingContext2D.prototype = {};
global.Blob = class {};
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };

const src = fs.readFileSync(__dirname + "/index.html", "utf8");
// verify every getElementById target in app.js exists in index.html
const app = fs.readFileSync(__dirname + "/app.js", "utf8");
const wanted = [...app.matchAll(/\$\("([^"]+)"\)/g)].map(m => m[1]);
const missing = [...new Set(wanted)].filter(id => !src.includes(`id="${id}"`));
if (missing.length) { console.error("MISSING IDS IN HTML:", missing); process.exit(1); }
console.log("✓ all", new Set(wanted).size, "element IDs referenced by app.js exist in index.html");

// the JSON export button was removed on purpose — make sure it doesn't come back half-wired
if (src.includes('id="btnExport"') || app.includes("btnExport")) {
  console.error("✗ btnExport should no longer exist"); process.exit(1);
}
console.log("✓ export (JSON) button removed");

require("./app.js");
console.log("✓ app.js executed without throwing");

// verify computed outputs rendered
const checks = ["stdPerSession", "stdMonthly", "ghcpPerSession", "ghcpMonthly", "vStdCost", "vGhcpCost", "deltaX", "volumeNote"];
let fail = 0;
for (const id of checks) {
  const v = ids.get(id).textContent;
  const ok = v && v !== "0" && v !== "";
  console.log((ok ? "✓" : "✗"), id, "=", JSON.stringify(v));
  if (!ok) fail++;
}

// numeric sanity: employee preset — 500 users × 12 sessions, mix 1C+4G+2A+3Graph = 1+8+10+30 = 49 cr/session
const expPerSess = 1 * 1 + 4 * 2 + 2 * 5 + 3 * 10; // 49
console.log("expected std credits/session:", expPerSess, "rendered:", ids.get("stdPerSession").textContent);
if (ids.get("stdPerSession").textContent !== "49") { console.error("✗ per-session mismatch"); fail++; }

// 6000 sessions × 49 = 294,000 total; 200 of 500 users licensed → 60% unlicensed = 176,400 billable
const billable = 294000 * 0.6;
console.log("expected billable credits:", billable, "rendered:", ids.get("stdMonthly").textContent);
if (ids.get("stdMonthly").textContent !== "176.4K") { console.error("✗ billable mismatch"); fail++; }

// licensed-user count is absolute now — verify the volume note reflects it
if (!ids.get("volumeNote").textContent.includes("200 of 500 users")) { console.error("✗ volume note should say '200 of 500 users'"); fail++; }
else console.log("✓ volume note reports absolute licensed-user count");

// GHCP: 60/30/10 mix × (200/400/700) = 120+120+70 = 310 cr/task; ×6000 = 1.86M runtime; dev 2×60×150=18K
console.log("expected ghcp cr/task: 310 rendered:", ids.get("ghcpPerSession").textContent);
if (ids.get("ghcpPerSession").textContent !== "310") { console.error("✗ ghcp per-task mismatch"); fail++; }
console.log("expected ghcp dev burn: 18K rendered:", ids.get("ghcpDev").textContent);
if (ids.get("ghcpDev").textContent !== "18.0K") { console.error("✗ dev burn mismatch"); fail++; }

// pricing sanity: std 176,400 credits -> 7 packs (175K) + 1400 payg = 7*200+14 = $1,414 vs payg $1,764
const vStd = ids.get("vStdCost").textContent;
console.log("expected std cost $1,414 rendered:", vStd);
if (vStd !== "$1,414") { console.error("✗ std pack-optimizer cost mismatch"); fail++; }

// ghcp total = 1,860,000 + 18,000 = 1,878,000 -> 75 packs (1,875,000) + 3,000 payg = 15,000 + 30 = $15,030
const vG = ids.get("vGhcpCost").textContent;
console.log("expected ghcp cost $15,030 rendered:", vG);
if (vG !== "$15,030") { console.error("✗ ghcp cost mismatch"); fail++; }

/* ---------- rate card lock / unlock ---------- */
// rate inputs start locked
if (!ids.get("rGen").disabled) { console.error("✗ rate inputs should start disabled (locked)"); fail++; }
else console.log("✓ rate card starts locked");

// unlocking requires confirmation
ids.get("btnUnlockRates").dispatch("click");
if (confirmCalls !== 1) { console.error("✗ unlock should ask for confirmation"); fail++; }
else console.log("✓ unlock asks for confirmation");
if (ids.get("rGen").disabled) { console.error("✗ rate inputs should be enabled after unlock"); fail++; }
else console.log("✓ rate inputs enabled after unlock");

// edit generative rate 2 → 3: per-session becomes 1 + 4*3 + 10 + 30 = 53
ids.get("rGen").value = "3";
ids.get("rGen").dispatch("input");
console.log("expected std credits/session after rate edit: 53 rendered:", ids.get("stdPerSession").textContent);
if (ids.get("stdPerSession").textContent !== "53") { console.error("✗ edited rate not applied"); fail++; }
if (ids.get("ratesWarn").hidden) { console.error("✗ custom-rates warning should be visible"); fail++; }
else console.log("✓ custom-rates warning shown");

// reset restores list rates
ids.get("btnResetRates").dispatch("click");
console.log("expected std credits/session after reset: 49 rendered:", ids.get("stdPerSession").textContent);
if (ids.get("stdPerSession").textContent !== "49") { console.error("✗ reset did not restore list rates"); fail++; }
if (!ids.get("ratesWarn").hidden) { console.error("✗ warning should hide after reset"); fail++; }
else console.log("✓ reset restores list rates and hides warning");

// re-lock
ids.get("btnUnlockRates").dispatch("click");
if (!ids.get("rGen").disabled) { console.error("✗ rate inputs should be disabled after re-lock"); fail++; }
else console.log("✓ rate card re-locked");

/* ---------- report export smoke tests ---------- */
(async () => {
  // PDF report: click btnPdf and verify the print window received a full report
  ids.get("btnPdf").dispatch("click");
  const pdfChecks = [
    ["<!DOCTYPE html>", "report is a full HTML document"],
    ["Copilot Studio Credit Estimate", "report title present"],
    ["$1,414", "standard monthly cost in report"],
    ["$15,030", "ghcp monthly cost in report"],
    ["176.4K", "billable credits in report"],
    ["window.print()", "print trigger present"],
    ["Assumptions", "assumptions section present"],
  ];
  for (const [needle, label] of pdfChecks) {
    const ok = openedReportHtml && openedReportHtml.includes(needle);
    console.log((ok ? "✓" : "✗"), "pdf report:", label);
    if (!ok) fail++;
  }

  // PDF report must survive a blocked pop-up (window.open returning null) by downloading instead
  openedReportHtml = null;
  const realOpen = global.window.open;
  global.window.open = () => null;
  let threw = false;
  try { ids.get("btnPdf").dispatch("click"); } catch { threw = true; }
  global.window.open = realOpen;
  console.log((threw ? "✗" : "✓"), "pdf report: pop-up-blocked fallback doesn't throw");
  if (threw) fail++;

  // Copy Markdown: click btnCopy and verify Markdown landed on the clipboard
  await Promise.all(ids.get("btnCopy").dispatch("click"));
  const mdChecks = [
    ["# Copilot Studio Credit Estimate", "markdown H1 present"],
    ["| Monthly cost | $1,414 | $15,030 |", "markdown cost row correct"],
    ["| Credits per session / task | 49 | 310 (weighted) |", "markdown per-session row correct"],
    ["## Assumptions", "markdown assumptions section present"],
    ["| Active users / callers | 500 |", "markdown users assumption correct"],
    ["| Users with M365 Copilot license | 200 of 500 |", "markdown licensed-users assumption correct"],
    ["| Rate card | Microsoft list rates", "markdown rate-card provenance row present"],
  ];
  for (const [needle, label] of mdChecks) {
    const ok = copiedText && copiedText.includes(needle);
    console.log((ok ? "✓" : "✗"), "copy markdown:", label);
    if (!ok) fail++;
  }

  process.exit(fail ? 1 : 0);
})();
