Version: 1.2   |    Updated: 2026-04-13

IMPORTANT: READ FIRST
Before reading this file, you must have already read: asc-agent-core/AGENT.md
All rules in the master constitution apply here without exception. This file adds MeetingGenius-specific context, constraints, and permissions. Where this file conflicts with the master constitution, the master constitution wins. Flag any conflict immediately in your PR rather than resolving it yourself.

1. PRODUCT OVERVIEW
Product: MeetingGenius 
URLs: 
(Canada) https://meetinggenius.ca (marketing) | https://app.meetinggenius.ca (application) 
(Rest of World) https://meetinggenius.co (marketing) | https://app.meetinggenius.co (application) 
Purpose: AI-assisted meeting capture and formal Minutes generation for property managers, self-administered strata boards, HOA’s (USA), building schemes (Australia) real estate developers, and associations.
What this product is NOT:
Not a generic note-taking or transcription tool
Not an enterprise governance platform
Not a real-time transcription service (planned future feature — do not build toward it)
Core user promise: A property manager can run a meeting and have draft Minutes ready to send within minutes of the meeting ending — without manual formatting, copy-pasting, or administrative overhead.
User profile: Non-technical property managers and board members. All UI language must be plain, jargon-free, and in localised English.

2. TECH STACK
Frontend
React / Next.js
Progressive Web App (PWA) with offline capability and push notifications
Responsive — desktop, tablet, and phone must all work correctly
Localised English throughout all user-facing strings
Backend
Node.js / Express
[JEFF TO CONFIRM: ORM and database query layer]
Database
PostgreSQL
[JEFF TO DOCUMENT: Schema in CODEBASE.md before agent tasks begin]
Authentication
Passwordless — access via secure emailed links (no username/password login)
[JEFF TO CONFIRM: Token mechanism and session handling]
AI Integration
Anthropic Claude API
Used for: Minutes drafting, task suggestions, statute lookups, letter drafting
Model: claude-sonnet-4-20250514
Hosting
Cloud-native, Canadian region
Data hosted exclusively in Canada or Australia — non-negotiable
Email
[JEFF TO CONFIRM: Email service provider for task notifications and access links]

3. CORE MODULES — MAP & PERMISSIONS
Read this section carefully. It defines what you may and may not touch.
3.1 Module Map
Module | Description | Agent Permission
--- | --- | ---
Agenda Builder | Create/edit agendas, topic cards, attachments, rollover logic | ✅ Allowed
GeniusWords™ | Custom shorthand system for fast note entry | ✅ Allowed
Meeting Runner | Real-time note capture during live meetings | ⚠️ Caution — flag changes
Minutes Generator | Draft Minutes production after meeting ends | 🚫 No autonomous changes
Task Management | Task creation, assignment, carry-forward, email notifications | ✅ Allowed
Activity Stream | All-tasks view across meetings | ✅ Allowed
Minutes Search | Search past Minutes by keyword | ✅ Allowed
AI Integration Layer | Claude API calls, statute lookup, letter drafting | ⚠️ Caution — flag changes
Authentication | Passwordless email link access | 🚫 Never touch
Encryption / Storage | File storage, encryption at rest | 🚫 Never touch
Branding / White Label | Logo upload, minute layout customization | ✅ Allowed
Push Notifications | PWA notification preferences and delivery | ✅ Allowed
User / Org Management | User accounts, corporate multi-user setup | ⚠️ Caution — flag changes
Payment / Billing | Subscription management | 🚫 Never touch

3.2 Permission Definitions
✅ Allowed: You may build features, fix bugs, and refactor within this module. Always open a Draft PR. Never merge yourself.
⚠️ Caution: You may read and understand this module to inform adjacent work, but flag any intended changes in the PR before writing code. Wait for human confirmation before modifying.
🚫 Never touch: Do not read, modify, reference, or depend on new behaviour from these modules unless the task brief explicitly instructs it AND the human has confirmed in writing. Flag any task that requires touching these areas and stop work until clarified.

4. DOMAIN KNOWLEDGE — READ BEFORE EVERY TASK
Understanding this context will make your code and UI language accurate for MeetingGenius users.
4.1(a) Canadian Property Management Context
Users run formal meetings governed by provincial legislation (BC Strata Property Act, AB Condominium Property Act, etc.)
Minutes are legal documents — accuracy, formatting, and completeness matter
Tasks assigned during meetings often involve suppliers, contractors, and board members
Votes recorded during meetings must be accurate and attributable
(b) Australian Property Management Context
Users run formal meetings governed by state legislation 
Minutes are legal documents — accuracy, formatting, and completeness matter
Tasks assigned during meetings often involve suppliers, contractors, and board members
Votes recorded during meetings must be accurate and attributable
4.2 Key Terminology
Use these terms consistently in all code comments, UI strings, and PR descriptions:
Term | Meaning
--- | ---
Meeting | A formal board or strata meeting
Minutes | The formal written record of a meeting (capital M)
Agenda | The structured list of topics for a meeting
Topic | A single agenda item with its own card
Directive | An instruction or decision recorded during a meeting
Task | An action item assigned to a person or supplier
GeniusWord™ | A custom shorthand that expands to full text during note-taking
Rollover | Carrying an unresolved topic or task forward to the next meeting
Board Member | An elected member of a strata or condo board
Property Manager | Professional managing a strata or condo property

4.3 Compliance Requirements
All data must remain hosted in Canada
Minutes must comply with local regional record-keeping standards
Retention requirements vary by region - do not build any auto-delete logic without explicit human instruction and legal review noted in the task brief

5. PRIORITIZED FEATURE CANDIDATES
The following features have been pre-approved as good agent tasks. When a task brief references one of these, you have context on expected scope.
Tier 1 — Ready Now (Low Risk)
GeniusWords™ Management UI — bulk import/export, categories, search interface
Minutes Template Builder — user-created and saved custom minute layouts
Task Email Notification Customization — template editor for task assignment emails
Minutes Search Enhancement — filters by date range, topic, assignee, decision type
Tier 2 — Second Wave (Medium Complexity)
Agenda Rollover Rules — configurable rules for auto-rollover vs. manual promotion
Vote Recording & Reporting — voting summary report per meeting, exportable
Push Notification Preferences — user preference panel for PWA notifications
French Language Minutes Output — generate Minutes in French using AI layer
Tier 3 — Human Developer Lead Required (Do Not Start Autonomously)
Transcription integration
External calendar sync (Google Calendar, Outlook)
Statute lookup expansion to new provinces

6. MEETINGGENIUS-SPECIFIC CODE STANDARDS
In addition to the master constitution code standards, in Canada: 
All user-facing date formats must use Canadian convention: Month DD, YYYY (e.g., April 9, 2026 — not 04/09/2026)
All currency references must be in CAD
Province names must be spelled in full on first reference in any UI string (e.g., "British Columbia" not "BC" in headings — abbreviations acceptable in tables)
Minutes output must maintain professional formatting — no casual language, no contractions in generated Minutes content
Task email notifications send from the user's own email address — never change the sender configuration without explicit instruction

7. INTEGRATIONS — CURRENT & PLANNED
Currently Active
Integration | Purpose | Agent Interaction
--- | --- | ---
Anthropic Claude API | Minutes drafting, AI suggestions, letter drafting | Read-only understanding. Flag any prompt or model changes.
Email service (TBC) | Task notifications, passwordless login links | Do not modify email sending logic
Mattermost (self-hosted) | Agent task intake and PR notifications | Post to #mg-dev channel only. Never post to other channels. Receives task briefs routed by ASC Agent Service from #agent-intake.
ASC Agent Service | Orchestration layer — validates briefs, calls Claude API, manages GitHub operations | This service calls you (Claude API). You do not call it. Understand it exists as the runner for all your tasks.

Planned (Do Not Build Toward Without Explicit Task Brief)
Real-time transcription
Google Calendar / Outlook sync
Odoo CRM integration
Payment/subscription management updates

8. TESTING REQUIREMENTS
In addition to master constitution testing requirements:
Any change to Minutes generation output must include a test that validates the output contains all required sections: agenda topics, notes, decisions, tasks, and votes
Any change to task carry-forward logic must include a test confirming tasks appear correctly on the next meeting's agenda
Any change to GeniusWords™ must include expansion accuracy tests
UI changes must be tested on mobile viewport (375px width minimum) as well as desktop

9. CONTRACTOR SETUP CHECKLIST
Before the first agent task runs, the developer must complete:
[ ] Document full database schema in CODEBASE.md
[ ] Confirm and document authentication token mechanism
[ ] Confirm email service provider and document in ARCHITECTURE.md
[ ] Map all existing API endpoints in CODEBASE.md
[ ] Identify and document any existing technical debt areas to avoid
[ ] Confirm AI prompt structure and document in ARCHITECTURE.md
[ ] Validate all module boundaries listed in Section 3 against actual codebase
[ ] Confirm ASC Agent Service is deployed on VPS and reachable
[ ] Confirm Mattermost webhook is connected to ASC Agent Service
[ ] Confirm GitHub API token (Octokit) has correct repo permissions
[ ] Confirm Claude API key is set in ASC Agent Service environment variables
[ ] Run one test task end-to-end with Tim posting in Mattermost before handing off

10. VERSION CONTROL FOR THIS FILE
This file is maintained by ASC Creative. Agents do not modify this file. Proposed changes must be submitted as a human-authored PR with the label product-config-update and approved by the platform owner (Tim).
