# ⚡ Copilot Studio Credit Estimator

**Live tool → https://ogradyliam5.github.io/copilot-studio-credit-estimator/**

An interactive, zero-dependency estimator for **Microsoft Copilot Studio** credit consumption and cost —
modeling the **Standard harness** and the **GitHub Copilot harness** side by side, because they are
*not* priced the same way. Not even close.

![Standard vs GitHub Copilot harness](https://img.shields.io/badge/Standard-rate--card%20billing-38bdf8) ![GHCP](https://img.shields.io/badge/GitHub%20Copilot%20harness-usage--based-c084fc) ![deps](https://img.shields.io/badge/dependencies-0-34d399)

> 🤖 This tool was developed by **Liam's engineering agent**, built in the **Copilot Studio GitHub
> Copilot harness** running **Claude Fable**, connected to GitHub through the **GitHub MCP server**.

## Why this exists

Copilot Studio now runs everything on a **harness** — the runtime between your agent design and the
model. The harness you pick changes not just capability, but the entire billing model:

| | 🧱 Standard harness | 🐙 GitHub Copilot harness |
|---|---|---|
| Billing | Fixed per-feature rate card | Usage-based Copilot Credits |
| Authoring | **Free until publish** | **Metered from the first build action** (testing & evals billed) |
| M365 Copilot license inclusion | ✅ B2E usage = $0 (fair use) | ❌ Never — all usage billed |
| Typical cost per run | 1–50 credits | 100 to 500+ credits per task |
| Superpowers | Deterministic, auditable, cheap | Agentic loop, file generation, skills, self-recovery |

A light GitHub Copilot harness task (100–300 credits) can cost **5–15× a complete Standard-harness
multi-step run** — but it can also do things the Standard harness architecturally cannot.
This tool lets you put numbers on that trade-off *before* the invoice does.

## What it models

- **Standard harness rate card** — classic answers (1 cr), generative answers (2 cr), agent actions
  (5 cr), tenant graph grounding (10 cr), agent flow actions (13 cr / 100), AI tools
  (0.1 / 1.5 / 10 cr per 1K tokens), reasoning-model surcharge (+10 cr / 1K tokens),
  content processing (8 cr / page)
- **Editable rate card** — the rate card is split into clearly separated Standard-harness and
  GitHub-Copilot-harness groups, and every rate can be edited if Microsoft's published rates change.
  It's **locked by default**: unlocking requires an explicit confirmation, a warning banner is shown
  whenever custom rates are in effect, exported reports are flagged as using CUSTOM rates, and a
  one-click reset restores the list rates
- **M365 Copilot license inclusion** — enter the **number of licensed users** (capped at your active
  users) whose B2E Standard-harness usage bills $0
- **GitHub Copilot harness task tiers** — light (100–300), medium (300–500), heavy (>500) with a
  configurable complexity mix and adjustable tier midpoints
- **Development burn** — GHCP bills authoring, previewing, testing and eval generation; model your
  makers × test runs × credits per run
- **Pack optimizer** — cheapest blend of prepaid 25K-credit packs ($200) + PAYG ($0.01/credit)
  overflow, with a warning when you'd trip the **125% overage enforcement** threshold
- **Break-even scaling chart**, a **build-phase vs steady-state chart** (what a dev/test month costs
  before launch vs a typical production month, with the GHCP ongoing dev burn broken out),
  **credit composition breakdown**, and a **capability-gap matrix** for the things money can't buy
- **Shareable scenarios** — the full input state (including any custom rates) is encoded in the URL;
  export any estimate as a copy-paste **Markdown report**

## Exporting a report

- **📋 Copy Markdown** — copies the full report (comparison table, cost multiple, verdict,
  assumptions and the scenario link) to the clipboard as **Markdown** that pastes cleanly
  into email, Teams, Word/OneNote, GitHub issues and wikis. If the clipboard isn't available, the
  report downloads as a `.md` file instead.

Every report embeds the scenario link, so anyone reading it can reopen the exact same inputs.

## Running locally

No build step, no dependencies:

```bash
git clone https://github.com/ogradyliam5/copilot-studio-credit-estimator.git
cd copilot-studio-credit-estimator
python3 -m http.server 8000   # or just open index.html
```

Run the headless smoke tests (validates the calculation engine, the rate-card lock/unlock flow and
the report exports against hand-computed expectations):

```bash
node smoke-test.js
```

## Sources

- [Billing rates and management (Standard harness) — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
- [Overview of usage-based billing (GitHub Copilot harness) — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/billing-credit-overview)
- [Choose a harness — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-copilot-studio/harnesses-overview)
- [Quotas and limits — Microsoft Learn](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-quotas)

## Disclaimer

Planning estimate only — **not a billing commitment**. Rates current as of August 2026 and exclude
bring-your-own-model (Azure Foundry) configurations. GHCP tiers are published as ranges; actual
consumption depends on agent design, knowledge sources and tool calls. The M365 Copilot inclusion is
B2E-only, subject to fair-use limits Microsoft can revise, excludes Computer-Using Agents, and for
agent flows applies only to the *"When an agent calls the flow"* trigger. Always verify against the
current [Copilot Studio Licensing Guide](https://learn.microsoft.com/en-us/microsoft-copilot-studio/billing-licensing) before procurement decisions.

## Credits

Developed by **Liam's engineering agent** — an autonomous software engineering agent built in the
**Copilot Studio GitHub Copilot harness**, running **Claude Fable**, and connected to GitHub through
the **GitHub MCP server** (which it used to inspect the repository, commit the code and open the
pull requests for this project).

## License

MIT
