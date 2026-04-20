# ASC Agent Service — Master Build Plan (Option B)
Version: 2.1 | Updated: 2026-04-17 | Owner: ASC Creative

> **Working Agreement:** We tackle one phase at a time. You select a phase → I identify which files I need → You provide them → We complete the task → Mark it done → Move to the next.

## ⚡ Build Order (Updated)

> **Reason:** Stakeholder needs to see the dashboard before the engine is built. Frontend is built first with mock data, then the backend engine is built, then everything is wired together.

| Order | Phases | Layer | Status |
|-------|--------|-------|--------|
| **First** | 10 → 16 | 🖥️ Frontend Dashboard (Core) | ✅ done |
| **Second** | 1 → 9 | 🔧 Backend Engine | ✅ done |
| **Third** | 17 → 18 | 🚀 MeetingGenius Linkup & Handoff | ✅ done |

---

## 🔵 Status Key

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🟡 | In progress |
| ✅ | Done |
| 🔴 | Blocked — needs input |

---

## Pre-Flight Checklist

| Item | Status | Notes |
|------|--------|-------|
| Local OS confirmed | ✅ | Windows |
| Node.js installed + version confirmed | ✅ | Node.js v24.12.0 / npm 11.6.2 |
| GitHub account ready | ⬜ | Confirm if ASC-Creative org exists |
| Anthropic API key ready | ⬜ | Needed for Phase 5 |
| Mattermost instance status | ⬜ | Self-hosted or needs setup? |
| VPS details (for later deployment) | ⬜ | Node version, PM2 in use? |

---

## 🔧 BACKEND PHASES (The Engine)

---

## Phase 1 — Project Foundation & Local Server ✅ COMPLETE
**Goal:** A clean Node.js/Express skeleton boots on localhost with a working health-check endpoint.

**Localhost test:** `GET http://localhost:3000/health` → `{ "status": "ok", "service": "asc-agent-service" }`

### Tasks
| # | Task | Status |
|---|------|--------|
| 1.1 | Run `npm init` and set up base project structure | ✅ |
| 1.2 | Install Express and core dependencies | ✅ |
| 1.3 | Create `.env` and `.env.example` files | ✅ |
| 1.4 | Create `server.js` entry point with Express app | ✅ |
| 1.5 | Create `/health` endpoint | ✅ |
| 1.6 | Create empty stub files for all 6 modules | ✅ |
| 1.7 | Confirm server boots: `node server.js` → no errors | ✅ |

### Folder Structure (Completed)
```
asc-agent-service/
├── server.js                   ✅
├── .env                        ✅ (not committed)
├── .env.example                ✅
├── .gitignore                  ✅
├── package.json                ✅
├── routes/
│   └── webhook.js              ✅ stub
├── modules/
│   ├── briefValidator.js       ✅ stub
│   ├── contextAssembler.js     ✅ stub
│   ├── claudeClient.js         ✅ stub
│   ├── githubWriter.js         ✅ stub
│   ├── mattermostNotifier.js   ✅ stub
│   └── envConfig.js            ✅ active
└── tests/
    └── README.md               ✅
```

---

## Phase 2 — Mattermost Webhook Listener ✅ COMPLETE
**Goal:** Express receives and logs incoming Mattermost outgoing webhook events from `#agent-intake`.

**Localhost test:** Simulate a webhook POST with `curl` or Postman → confirm payload is received and logged cleanly.

### Tasks
| # | Task | Status |
|---|------|--------|
| 2.1 | Build `POST /webhook` route in `routes/webhook.js` | ✅ |
| 2.2 | Parse raw Mattermost webhook payload | ✅ |
| 2.3 | Log parsed payload to console (no PII logged) | ✅ |
| 2.4 | Return `HTTP 200` acknowledgement to Mattermost | ✅ |
| 2.5 | Test with curl — confirm receipt and log | ✅ |

### Notes
- No validation at this stage — just receiving and acknowledging.
- Mattermost expects a fast `200` response or it will retry; acknowledge first, process async.

---

## Phase 3 — Brief Validator Module ✅ COMPLETE
**Goal:** Parse the incoming Mattermost message for all required task brief fields. Reply in-thread via Mattermost REST API if any fields are missing.

**Localhost test:**
- Complete brief → `"Task accepted"` thread reply.
- Incomplete brief → specific missing-fields reply.

### Required Task Brief Fields
```
Product:
Task Type:
Description:
Acceptance Criteria:
Priority:
Do Not Touch:
Reference Files:
```

### Tasks
| # | Task | Status |
|---|------|--------|
| 3.1 | Build `briefValidator.js` module | ✅ |
| 3.2 | Parse message body for all 7 required fields | ✅ |
| 3.3 | Return validation result (pass/fail + missing fields list) | ✅ |
| 3.4 | Post in-thread Mattermost reply on validation failure | ⬜ Phase 7 |
| 3.5 | Post in-thread Mattermost reply on validation success | ⬜ Phase 7 |
| 3.6 | Write unit tests (complete brief, missing 1 field, missing all fields) | ✅ |

### Notes
- Replies must be in-thread (use `root_id` from the webhook payload).
- Canadian English spelling in all reply strings.

---

## Phase 4 — GitHub Context Assembler Module ✅ COMPLETE
**Goal:** Given a product name from the validated brief, fetch the correct AGENT.md files and reference files from GitHub using Octokit.

**Localhost test:** Fetch `meetinggenius` context → confirm both AGENT.md files retrieved and assembled into a single context string, logged to console.

### Files Fetched Per Task
| File | Source Repo | Purpose |
|------|-------------|---------|
| `asc-agent-core/AGENT.md` | `asc-agent-core` | Master constitution — system prompt base |
| `[product]/AGENT.md` | Product repo | Product-specific rules |
| `[product]/CODEBASE.md` | Product repo | Module map and schema context |
| `[product]/ARCHITECTURE.md` | Product repo | Tech stack context |
| Reference files from brief | Product repo | Task-specific code context |

### Tasks
| # | Task | Status |
|---|------|--------|
| 4.1 | Install and configure Octokit | ✅ |
| 4.2 | Store GitHub token in `.env` | ✅ |
| 4.3 | Build `contextAssembler.js` — fetch `asc-agent-core/AGENT.md` | ✅ |
| 4.4 | Build product AGENT.md fetch based on product name | ✅ |
| 4.5 | Build reference file fetch from brief's `Reference Files` field | ✅ |
| 4.6 | Assemble all fetched content into single context string | ✅ |
| 4.7 | Write unit tests for assembler | ✅ |

---

## Phase 5 — Claude API Client Module ✅ COMPLETE
**Goal:** Send assembled context + task brief to `claude-sonnet-4-20250514`. Receive generated code response.

**Localhost test:** Real task brief → Claude returns usable code response logged to console.

### Prompt Structure
```
System Prompt:  [asc-agent-core/AGENT.md] + [product/AGENT.md] + [CODEBASE.md] + [ARCHITECTURE.md]
User Prompt:    [Task Brief] + [Reference File Content]
```

### Tasks
| # | Task | Status |
|---|------|--------|
| 5.1 | Install Anthropic Node.js SDK | ✅ |
| 5.2 | Store Anthropic API key in `.env` | ✅ |
| 5.3 | Build `claudeClient.js` module | ✅ |
| 5.4 | Assemble system prompt from context string (Phase 4 output) | ✅ |
| 5.5 | Assemble user prompt from task brief | ✅ |
| 5.6 | Call `claude-3-5-sonnet-20240620` with assembled prompt | ✅ |
| 5.7 | Parse and return Claude's generated code response | ✅ |
| 5.8 | Write unit tests (mock the API call — never hit real API in tests) | ✅ |

### Notes
- Only task brief and source code context goes to Claude. **Never customer data.**
- Anthropic does not store API request content for model training by default.

---

## Phase 6 — GitHub Writer Module ✅ COMPLETE
**Goal:** Create a feature branch `agent/[description]-[date]`, commit Claude's code, open a structured Draft PR.

**Localhost test:** Trigger a dummy task → real Draft PR appears in GitHub with the correct PR template structure.

### Branch Naming Convention
```
agent/[short-description]-[date]
Example: agent/geniuswords-export-20260417
```

### PR Template (Required Structure)
```markdown
## Task Summary
## Changes Made
## Testing Performed
## New Dependencies
## Data & Privacy Flags
## Security Flags
## Do Not Touch Violations Noted
## Human Review Checklist
```

### Tasks
| # | Task | Status |
|---|------|--------|
| 6.1 | Build `githubWriter.js` module | ✅ |
| 6.2 | Create feature branch using Octokit | ✅ |
| 6.3 | Commit generated code to the correct file path | ✅ |
| 6.4 | Open Draft PR with structured description from AGENT.md template | ✅ |
| 6.5 | Return PR URL for use by Mattermost Notifier | ✅ |
| 6.6 | Write unit tests (mock Octokit calls) | ⬜ Phase 18 Integration |

### Notes
- **Never merge** — only open Draft PRs. Human approval in GitHub always required.

---

## Phase 7 — Mattermost Notifier Module ✅ COMPLETE
**Goal:** Post the right message to the right Mattermost channel based on task outcome.

**Localhost test:** Each notification type posts to the correct Mattermost channel with the right content.

### Notification Routing
| Event | Target Channel | Message Content |
|-------|---------------|-----------------|
| Task accepted | `#agent-intake` (in-thread) | "Task accepted. Claude is working on it." |
| Draft PR opened | `#[product]-dev` (e.g. `#mg-dev`) | PR link + plain-language summary |
| Escalation triggered | `#agent-alerts` | Stop-condition reason + options for human |

### Tasks
| # | Task | Status |
|---|------|--------|
| 7.1 | Build `mattermostNotifier.js` module | ✅ |
| 7.2 | Implement task acknowledgement post (in-thread `#agent-intake`) | ✅ |
| 7.3 | Implement Draft PR notification post (to `#[product]-dev`) | ✅ |
| 7.4 | Implement escalation alert post (to `#agent-alerts`) | ✅ |
| 7.5 | Route to correct product channel based on product name in brief | ✅ |
| 7.6 | Write unit tests (mock Mattermost REST API calls) | ⬜ Phase 18 Integration |

---

## Phase 8 — Escalation Handler ✅ COMPLETE
**Goal:** Detect stop conditions from AGENT.md Section 7. Stop work, document findings, post to `#agent-alerts`.

**Localhost test:** Brief referencing Authentication module → hits escalation path → posts to `#agent-alerts` with a clear reason.

### Escalation Triggers
- Task requires modifying authentication, payments, encryption, or core data models
- Discovered security vulnerability or exposed credential
- Conflict between master AGENT.md and product AGENT.md
- Task scope is ambiguous (two reasonable interpretations exist)
- Task requires a new third-party integration
- Code found that appears written incorrectly or dangerously

### Tasks
| # | Task | Status |
|---|------|--------|
| 8.1 | Build escalation detection logic | ✅ |
| 8.2 | Scan task brief for escalation keywords (auth, payment, encryption, etc.) | ✅ |
| 8.3 | Stop processing pipeline on escalation trigger | ✅ |
| 8.4 | Build escalation payload: what was found, decision point reached, options | ✅ |
| 8.5 | Post escalation payload to `#agent-alerts` via Mattermost Notifier | ✅ |
| 8.6 | Write unit tests for each escalation trigger type | ✅ |

---

## Phase 9 — Error Handling & Hardening ✅ COMPLETE
**Goal:** Every external API call has proper error handling. No PII logged. No credentials logged. No silent failures.

**Localhost test:**
- Simulate GitHub API failure → logged error + graceful `#agent-alerts` notification.
- Simulate Claude API timeout → logged error + graceful `#agent-alerts` notification.
- Simulate Mattermost post failure → logged error (no crash).

### Tasks
| # | Task | Status |
|---|------|--------|
| 9.1 | Add `try/catch` + meaningful error messages to all Octokit calls | ✅ |
| 9.2 | Add `try/catch` + meaningful error messages to all Claude API calls | ✅ |
| 9.3 | Add `try/catch` + meaningful error messages to all Mattermost REST calls | ✅ |
| 9.4 | Confirm no PII, customer data, or credentials appear in any log | ✅ |
| 9.5 | Validate `.env.example` matches all variables currently in use | ✅ |
| 9.6 | Canadian English spelling audit on all user-facing error strings | ✅ |
| 9.7 | Test graceful failure: each external service simulated as down | ✅ |

---

## 🖥️ FRONTEND PHASES (The Dashboard)

---

## Phase 10 — Dashboard Foundation & Design System ✅ COMPLETE
**Goal:** Set up the React frontend inside the same project. Design system, colour tokens, light/dark mode, navigation layout. The shell of the dashboard with sidebar and top bar — no real data yet.

**Localhost test:** `http://localhost:3000` opens a clean, styled dashboard shell.

### Tasks
| # | Task | Status |
|---|------|--------|
| 10.1 | Set up React app inside `client/` folder | ✅ |
| 10.2 | Define design system: colour tokens, typography, spacing | ✅ |
| 10.3 | Implement light/dark mode toggle | ✅ |
| 10.4 | Build sidebar navigation component | ✅ |
| 10.5 | Build top bar component | ✅ |
| 10.6 | Wire up routing between dashboard pages (placeholders) | ✅ |
| 10.7 | Serve React app from Express in development | ✅ |

### Notes
- The dashboard is for internal ASC Creative use — not customer-facing.
- Mobile-responsive but desktop-primary.

---

## Phase 11 — Health Status Page ✅ COMPLETE
**Goal:** Show live connection status for all four services: Mattermost, GitHub, Claude API, and the ASC Agent Service itself. Green/yellow/red indicators with last-checked timestamps.

**Localhost test:** All four status indicators show live → disconnect one API key → see it go red immediately.

### Tasks
| # | Task | Status |
|---|------|--------|
| 11.1 | Build backend `GET /api/status` endpoint that pings all four services | ✅ |
| 11.2 | Build Health Status React page | ✅ |
| 11.3 | Green/yellow/red indicator component with last-checked timestamp | ✅ |
| 11.4 | Auto-refresh every 30 seconds | ✅ |
| 11.5 | Show meaningful error reason on red status | ✅ |

---

## Phase 12 — Live Activity Feed ✅ COMPLETE
**Goal:** Real-time log of everything the agent is doing — task received, validation result, GitHub fetch, Claude call, PR opened, notification sent. Auto-scrolling, colour-coded by event type.

**Localhost test:** Submit a task brief in Mattermost → watch every step appear live in the dashboard feed.

### Tasks
| # | Task | Status |
|---|------|--------|
| 12.1 | Add event emitter / log system to backend pipeline | ✅ |
| 12.2 | Build `GET /api/events` SSE (Server-Sent Events) stream endpoint | ✅ |
| 12.3 | Build Live Activity Feed React component | ✅ |
| 12.4 | Colour-code events by type (info, success, warning, error) | ✅ |
| 12.5 | Auto-scroll to latest event | ✅ |
| 12.6 | Timestamp each event | ✅ |

---

## Phase 13 — Task Intake Form ✅ COMPLETE
**Goal:** A web form to submit task briefs directly from the dashboard — as an alternative to typing in Mattermost. All required fields with inline validation. Submits directly to the Brief Validator.

**Localhost test:** Fill out the form → see it flow through the backend exactly like a Mattermost brief.

### Tasks
| # | Task | Status |
|---|------|--------|
| 13.1 | Build `POST /api/intake` backend endpoint (same validator as Mattermost) | ✅ |
| 13.2 | Build Task Intake Form React page | ✅ |
| 13.3 | All 7 required fields with inline validation | ✅ |
| 13.4 | Product selector dropdown (pulls from Product Registry) | ✅ |
| 13.5 | Task Type selector (Feature/Bug Fix/Refactor/Documentation/Test) | ✅ |
| 13.6 | Priority selector (High/Medium/Low) | ✅ |
| 13.7 | Submit → show live result in Activity Feed | ✅ |

---

## Phase 14 — Pull Request History ✅ COMPLETE
**Goal:** A table of all Draft PRs created by the agent — product name, task summary, branch name, PR link, date, and status (open/merged/closed). Filterable by product.

**Localhost test:** After Phase 6 creates a real PR → it appears in this table with a clickable GitHub link.

### Tasks
| # | Task | Status |
|---|------|--------|
| 14.1 | Build `GET /api/pull-requests` backend endpoint (fetch from GitHub via Octokit) | ✅ |
| 14.2 | Build PR History React page | ✅ |
| 14.3 | Table with columns: Product, Task Summary, Branch, PR Link, Date, Status | ✅ |
| 14.4 | Filter by product name | ✅ |
| 14.5 | Status badge: Open (blue) / Merged (green) / Closed (grey) | ✅ |
| 14.6 | Clickable PR link opens GitHub in new tab | ✅ |

---

## Phase 15 — Escalation Alerts Panel ✅ COMPLETE
**Goal:** A dedicated panel showing all escalation events — what triggered the stop, which product, which module was flagged, and what the agent recommended. Clearable by the product owner.

**Localhost test:** Trigger an escalation → it appears in the panel with full context and can be cleared.

### Tasks
| # | Task | Status |
|---|------|--------|
| 15.1 | Store escalation events in memory (or lightweight log file) | ✅ |
| 15.2 | Build `GET /api/escalations` and `DELETE /api/escalations/:id` backend endpoints | ✅ |
| 15.3 | Build Escalation Alerts Panel React page | ✅ |
| 15.4 | Show: trigger reason, product, flagged module, agent recommendation, timestamp | ✅ |
| 15.5 | "Clear" button to dismiss resolved escalations | ✅ |
| 15.6 | Unread escalation count badge on sidebar nav item | ✅ |

---

## Phase 16 — Product Registry ✅ COMPLETE
**Goal:** A list of all products onboarded into the platform — MeetingGenius, JANUS, and future products. Shows each product's repo, Mattermost channel, AGENT.md status, and CODEBASE.md status.

**Localhost test:** MeetingGenius and JANUS appear as cards with correct status indicators.

### Tasks
| # | Task | Status |
|---|------|--------|
| 16.1 | Build product registry config (JSON or env-driven — no DB needed yet) | ✅ |
| 16.2 | Build `GET /api/products` backend endpoint | ✅ |
| 16.3 | Build Product Registry React page | ✅ |
| 16.4 | Product card: name, repo link, Mattermost channel, AGENT.md ✅/⬜, CODEBASE.md ✅/⬜ | ✅ |
| 16.5 | Live check — confirm AGENT.md and CODEBASE.md exist in GitHub repo | ✅ |

---

## 🚀 FINAL PHASES (MeetingGenius + Handoff)

---

## Phase 17 — MeetingGenius Onboarding ✅ COMPLETE
**Goal:** Audit the MeetingGenius repo. Write `CODEBASE.md` and `ARCHITECTURE.md`. Validate module permissions from `meetinggenius/AGENT.md` against the actual codebase.

**Localhost test:** Context Assembler fetches all four MeetingGenius context files successfully.

### Deliverables
| Document | Content |
|----------|---------|
| `CODEBASE.md` | Full repo structure, module map, API endpoints, DB schema |
| `ARCHITECTURE.md` | Tech stack versions, auth mechanism, email provider, AI prompt structure, hosting |

### Tasks
| # | Task | Status |
|---|------|--------|
| 17.1 | Audit full MeetingGenius repo structure | ✅ |
| 17.2 | Document all API endpoints in `CODEBASE.md` | ✅ |
| 17.3 | Document full DB schema in `CODEBASE.md` | ✅ |
| 17.4 | Document tech stack versions in `ARCHITECTURE.md` | ✅ |
| 17.5 | Confirm and document auth token mechanism in `ARCHITECTURE.md` | ✅ |
| 17.6 | Confirm and document email provider in `ARCHITECTURE.md` | ✅ |
| 17.7 | Validate module permission table (Section 3, `meetinggenius/AGENT.md`) vs. actual code | ✅ |
| 17.8 | Flag any discrepancies as a Mattermost `#mg-dev` message | ✅ |
| 17.9 | Update Context Assembler to fetch all four MeetingGenius context files | ✅ |

---

## Phase 18 — End-to-End Flow Test & Handoff ⬜
**Goal:** The complete pipeline runs successfully with a real MeetingGenius task brief. All edge cases tested. Handoff documents produced for Tim.

**Full flow test:**
```
Post brief in #agent-intake (or Task Intake Form)
    → Brief Validator accepts it
    → Context Assembler fetches the right files
    → Claude generates usable code
    → GitHub Writer opens a correctly structured Draft PR
    → #mg-dev receives the PR link + plain-language summary
    → Dashboard Activity Feed shows every step live
    → PR appears in PR History table
```

### Deliverables
| Document | Purpose |
|----------|---------|
| PR Review Playbook | One page, plain language — how Tim reads a PR notification, reviews a Draft PR, and approves or requests changes |
| New Product Onboarding Guide | Step-by-step: repo creation, product AGENT.md from template, Mattermost channel setup, Context Assembler config (for JANUS and future products) |

### Tasks
| # | Task | Status |
|---|------|--------|
| 18.1 | Run full end-to-end flow with a real MeetingGenius task brief | ⬜ |
| 18.2 | Test edge case: incomplete brief → in-thread reply, stop | ⬜ |
| 18.3 | Test edge case: wrong product name → graceful error | ⬜ |
| 18.4 | Test edge case: escalation trigger → `#agent-alerts` post, stop | ⬜ |
| 18.5 | Write PR Review Playbook (non-technical, plain language) | ✅ |
| 18.6 | Write New Product Onboarding doc (covers JANUS onboarding) | ✅ |
| 18.7 | Run one Tier 1 MeetingGenius feature task end-to-end | ⬜ |
| 18.8 | Review PR together with Tim. Merge if ready. | ⬜ |

---

## Phase Summary

| Layer | Phases | What Gets Built |
|-------|--------|-----------------|
| 🔧 Backend | 1–9 | The engine — all 6 modules working end-to-end |
| 🖥️ Frontend | 10–16 | The dashboard — React web UI on top of the engine |
| 🚀 Handoff | 17–18 | MeetingGenius live, playbooks written, JANUS ready to onboard |

---

## Definition of Done

- [ ] GitHub Org live with `asc-agent-core`, `asc-agent-service`, `meetinggenius` repos
- [ ] ASC Agent Service deployed on VPS — all 6 modules operational
- [ ] React dashboard live and accessible
- [ ] `CODEBASE.md` and `ARCHITECTURE.md` for MeetingGenius complete and reviewed
- [ ] Branch protection active on all repos — no direct commits to `main` possible
- [ ] Mattermost channels live: `#agent-intake`, `#mg-dev`, `#agent-alerts`
- [ ] Mattermost webhook fires correctly to ASC Agent Service on new `#agent-intake` messages
- [ ] ASC Agent Service posts Draft PR link + plain-language summary to `#mg-dev` automatically
- [ ] Escalation events post to `#agent-alerts` with reason and next steps
- [ ] Dashboard shows live status, activity feed, PR history, and escalation panel
- [ ] One real MeetingGenius feature task has run end-to-end — PR reviewed and approved in GitHub
- [ ] Tim has a one-page PR Review Playbook he can use independently
- [ ] New product onboarding document exists (covers JANUS)

---

## Environment Variables Reference (`.env.example`)

```env
# Server
PORT=3000
NODE_ENV=development

# GitHub
GITHUB_TOKEN=                        # Personal Access Token with repo read/write
GITHUB_ORG=ASC-Creative               # GitHub organisation name

# Claude API
ANTHROPIC_API_KEY=                   # Anthropic API key

# Mattermost
MATTERMOST_URL=                      # e.g. https://mattermost.yourdomain.com
MATTERMOST_BOT_TOKEN=                # Mattermost bot user token
MATTERMOST_WEBHOOK_SECRET=           # Outgoing webhook token for validation

# Channel IDs
MATTERMOST_INTAKE_CHANNEL_ID=        # #agent-intake channel ID
MATTERMOST_ALERTS_CHANNEL_ID=        # #agent-alerts channel ID
```

---

*This file is maintained by ASC Creative. Update status symbols as phases complete. Do not modify the phase scope without a human-authored update.*
