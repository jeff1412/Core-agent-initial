ASC CREATIVE
Technical Developer Brief
ASC Creative Multi-Product Core Agent
April 2026  |  Version 1.1  |  Confidential

Mission
Set up a Claude Code-based software development agent platform connected to the ASC Creative
GitHub Organization, with Mattermost as the primary operator UI for task intake and notifications,
enabling AI agents to propose code changes across multiple products with human-in-the-loop approval.



1. Background & Context
ASC Creative builds SaaS products for Canadian SMBs. The product owner manages development on a project-by-project basis.

The primary goals of this project are to build: 
A pipeline approach that limits access to Github repo changes to prevent attacks from external AI Agents; and
A reusable development agent platform that allows the product owner to submit plain-language feature briefs and receive Draft Pull Requests from AI agents, reviewed by a developer before merging. This reduces development cycle time across multiple products.

The first product in the platform is MeetingGenius (meetinggenius.ca), an AI-assisted meeting management application for Canadian property managers. Next will be JANUS, an automated communications platform for repair requests and complaints. 

Additional products will be onboarded into the same platform over time using a common architecture.


2. Platform Architecture
2.1 Overview
The platform consists of four layers:

GitHub Organization (ASC-Creative) — the central code and configuration hub
asc-agent-core repo — the shared agent constitution and rules, applied to every product
Per-product repos — each product has its own repo, its own AGENT.md, and its own codebase documentation
ASC Agent Service — a lightweight Node.js / Express service (self-hosted VPS) that orchestrates all agent tasks
Mattermost (self-hosted) — the primary operator UI for task intake and agent notifications

2.2 ASC Agent Service — The Orchestration Layer
The ASC Agent Service is a custom Node.js / Express application deployed on a ASC Creative VPS. It is the sole orchestration engine for the platform — replacing any third-party automation tool. It is lightweight, fully under ASC Creative's control, and contains no customer data.

Data Flow

End-to-End Flow
1.  Post a task brief in Mattermost #agent-intake
2.  Mattermost webhook fires → ASC Agent Service receives the message
3.  Service validates the brief format. If fields are missing, replies in-thread and stops.
4.  Service fetches AGENT.md files + relevant codebase context from GitHub API (Octokit)
5.  Service calls Claude API: system prompt = AGENT.md content, user prompt = task + context
6.  Claude returns generated code
7.  Service uses GitHub API to create feature branch, commit code, open Draft PR
8.  Service posts PR link + plain-language summary to Mattermost #mg-dev (or #agent-alerts if escalation)
9.  Draft PR reviewed inGitHub. Approves and merges. Nothing auto-merges.


Key Components of the ASC Agent Service

Component | Technology | Purpose
--- | --- | ---
HTTP Server | Node.js / Express | Receives Mattermost webhook events. Exposes health-check endpoint.
Brief Validator | Custom module | Parses incoming Mattermost message. Validates all required task brief fields. Replies in-thread if incomplete.
Context Assembler | Octokit (GitHub SDK) | Fetches AGENT.md files and relevant source files from GitHub. Assembles system prompt and code context for Claude.
Claude API Client | Anthropic Node.js SDK | Sends assembled prompt to Claude API (claude-sonnet-4-5). Receives generated code response.
GitHub Writer | Octokit (GitHub SDK) | Creates feature branch, commits generated code, opens Draft PR with structured description.
Mattermost Notifier | Mattermost REST API | Posts task acknowledgement, PR summary, and escalation alerts to correct channels.
Environment Config | .env + dotenv | All API keys, tokens, and config stored as environment variables. Never hardcoded.


What the ASC Agent Service Does NOT Do
Does not merge Pull Requests — human approval in GitHub is always required
Does not store code or task data beyond what is needed to complete the current task
Does not transmit any MeetingGenius customer data to external services
Does not accept instructions from any source other than validated Mattermost messages

2.3 AI Model — Claude API
The Claude API (claude-sonnet-4-5) is the AI reasoning engine. It receives the task brief and codebase context assembled by the ASC Agent Service, and returns generated code. It is not a hosted runner or platform — it is an API call, like any other external service call in a Node.js application.

The only data sent to the Claude API is the task brief and the relevant source code context. No MeetingGenius customer data is ever included. Anthropic does not store API request content for model training by default.

2.4 Mattermost Integration — How It Works
Mattermost is the sole interface used to interact with the platform. All task submission and all status updates happen in Mattermost channels.

Intake Flow (Product Owner → Agent)
Post a structured task brief into #agent-intake
Mattermost fires a webhook to the ASC Agent Service
Service validates the brief — replies in-thread if fields are missing
Mattermost channel receives a thread confirmation that the task has been accepted and work has begun

Notification Flow (Agent → Product Owner)
Task acknowledged — service posts when Claude API call begins
Draft PR open — service posts the GitHub PR link plus a plain-language summary
Escalation — service posts stop-condition reason and options to #agent-alerts
All MeetingGenius notifications post to #mg-dev. Each product has its own channel.

What Mattermost Does NOT Do
Code review stays in GitHub PRs — Mattermost is for awareness only
Merges are never triggered from Mattermost — human approval in GitHub is always required
Mattermost messages from the agent are notifications only — not approvals

2.5 Mattermost Channel Structure

Channel | Purpose | Who Posts
--- | --- | ---
#agent-intake | Product Owner posts all task briefs here. ASC Agent Service receives via webhook. | Product Owner +  Service
#mg-dev | MeetingGenius agent notifications and PR summaries | Service only
#agent-alerts | Escalations, security flags, stop conditions across all products | Service only
#[product]-dev | Created for each new product at onboarding time | Service only


2.6 GitHub Organization Structure

Repo | Purpose | Who Maintains
--- | --- | ---
asc-agent-core | Master agent rules, shared prompts, PR templates, review playbook | Product Owner + Developer
asc-agent-service | The Node.js orchestration service codebase | Developer
meetinggenius | MeetingGenius application codebase | Developer + Agent
[future products] | One repo per product, same pattern | Developer + Agent


2.7 Two-Layer Agent Configuration
Every agent task reads two configuration files in sequence before touching any code:

Layer 1 — asc-agent-core/AGENT.md: Universal rules for all products (branching, security, privacy, PR standards)
Layer 2 — [product]/AGENT.md: Product-specific rules, module permissions, tech stack, do-not-touch areas

These files have been authored and are included as attachments to this brief.


3. Deliverables
Phase 1 — ASC Agent Service Build & Core Setup

Task | Detail
--- | ---
Create GitHub Organization | Name: ASC-Creative. Configure org-level settings, branch protection rules, and PR templates. Create repos: asc-agent-core, asc-agent-service, meetinggenius.
Build ASC Agent Service | Node.js / Express application with six modules: Brief Validator, Context Assembler (Octokit), Claude API Client (Anthropic SDK), GitHub Writer (Octokit), Mattermost Notifier, Environment Config. Deploy to ASC Creative VPS.
Mattermost webhook config | Create bot user in Mattermost. Create #agent-intake, #mg-dev, #agent-alerts channels. Configure outgoing webhook from #agent-intake to ASC Agent Service endpoint.
GitHub API token | Create GitHub Personal Access Token (or GitHub App) with repo read/write scope. Store in ASC Agent Service .env. Validate Octokit can create branches, commit, and open PRs.
Claude API integration | Configure Anthropic SDK in ASC Agent Service. Validate prompt assembly (AGENT.md as system prompt + task context as user prompt) produces usable code output on a test task.
Branch protection | Protect main on all repos. No direct commits. PRs require at least one human approval. Draft PR support enabled.
asc-agent-core repo | Add the provided AGENT.md. Add review-playbook.md for product owner. Add blank product AGENT.md template.


Phase 2 — MeetingGenius Onboarding

Task | Detail
--- | ---
Codebase audit | Document full repo structure, module map, database schema, API endpoints, and integration points in CODEBASE.md.
Architecture doc | Document tech stack, auth mechanism, email service, AI prompt structure, and hosting in ARCHITECTURE.md.
Product AGENT.md review | Review the provided meetinggenius/AGENT.md. Validate all module boundaries and permissions against the actual codebase. Flag any discrepancies to Mattermost channel.
Do-not-touch validation | Confirm auth, payments, encryption, and core data model boundaries match what is documented. Update product AGENT.md if needed.
Context Assembler config | Configure which MeetingGenius files the Context Assembler fetches for each task type. Balance completeness with token efficiency.
#mg-dev channel | Validate ASC Agent Service posts correctly to #mg-dev. Test PR summary format is readable by a non-technical user.


Phase 3 — Workflow Testing & Handoff

Task | Detail
--- | ---
End-to-end flow test | Run the full flow: Post brief in #agent-intake → ASC Agent Service validates → Claude API generates code → GitHub PR opens → #mg-dev notification received. Test missing fields, wrong product name, and escalation trigger edge cases.
PR review playbook | Write a one-page plain-language guide for Product Owner: how to read a Mattermost PR notification, what to look for in the GitHub Draft PR, and how to approve or request changes. Non-technical language throughout.
First live task | Run one real MeetingGenius feature brief end-to-end with Product Owner posting in Mattermost. Confirm #mg-dev notification arrives with PR link. Review PR together. Merge if ready.
New product onboarding doc | Document the step-by-step process to onboard a new product: repo creation, product AGENT.md from template, Mattermost channel setup, Context Assembler config. Should take one contractor session per product.



4. Provided Assets
The following files are authored and ready for your use. Review them before beginning Phase 1 and flag any questions.

asc-agent-core/AGENT.md — Master agent constitution (attached)
meetinggenius/AGENT.md — MeetingGenius product configuration (attached)

CODEBASE.md and ARCHITECTURE.md for MeetingGenius are to be authored by you in Phase 2 based on the actual codebase. Templates will be provided if needed.


5. Technical Constraints

Non-Negotiable Requirements
All Canadian customer data must remain hosted in Canada at all times.
No third-party service that transmits Canadian user data outside Canada may be introduced without explicit written approval.
Nothing merges to main without human review and approval — no exceptions.
Auth, payments, and encryption modules are never touched by agents autonomously.
All agent work opens a Draft PR. Agents never self-merge.
Canadian English throughout all user-facing strings in all products.


5.1 MeetingGenius Tech Stack (confirm and document)

Layer | Technology | Status
--- | --- | ---
Frontend | React / Next.js | Confirm version
PWA | Offline capability + push notifications | Confirm service worker implementation
Backend | Node.js / Express | Confirm version
Database | PostgreSQL | Confirm schema — document in CODEBASE.md
Auth | Passwordless email links | Confirm token mechanism — document in ARCHITECTURE.md
AI Model | Anthropic Claude API (claude-sonnet-4-5) | Confirm prompt structure
Agent Orchestration | ASC Agent Service — Node.js / Express, self-hosted VPS | Build in Phase 1
GitHub Integration | Octokit (GitHub SDK for Node.js) | Included in ASC Agent Service
Operator UI | Mattermost (self-hosted, ASC Creative instance) | Confirm bot user + webhook permissions
Email | TBC | Confirm provider — document in ARCHITECTURE.md
Hosting | ASC Creative VPS (agent service) + cloud-native Canadian region (products) | Confirm VPS specs and product hosting provider



6. Estimated Effort

Phase | Tasks | Estimated Hours
--- | --- | ---
Phase 1: ASC Agent Service Build & Core Setup | GitHub Org, asc-agent-core repo, Node.js service build (6 modules), Mattermost channels + webhook, GitHub API token, Claude API integration, branch protection | 16–24 hrs
Phase 2: MeetingGenius Onboarding | Codebase audit, CODEBASE.md, ARCHITECTURE.md, AGENT.md validation, Context Assembler config, #mg-dev notification testing | 12–18 hrs
Phase 3: Workflow Testing & Handoff | End-to-end flow testing, edge cases, PR playbook, first live task, new product onboarding doc | 6–10 hrs




7. Definition of Done
This engagement is complete when all of the following are true:

GitHub Organization is live with asc-agent-core, asc-agent-service, and meetinggenius repos
ASC Agent Service is deployed on VPS with all six modules operational
CODEBASE.md and ARCHITECTURE.md for MeetingGenius are complete and reviewed
Branch protection is active on all repos — no direct commits to main possible
Mattermost channels are live: #agent-intake, #mg-dev, #agent-alerts
Mattermost webhook fires correctly to ASC Agent Service on new #agent-intake messages
ASC Agent Service posts Draft PR link and plain-language summary to #mg-dev automatically
Escalation events post to #agent-alerts with reason and next steps
One real MeetingGenius feature task has run end-to-end — brief posted in Mattermost, PR notification received, PR reviewed and approved in GitHub
Product Owner has a one-page PR review playbook he can use independently
A new product onboarding document exists covering repo setup, AGENT.md template, and Mattermost channel configuration


8. Questions & Clarifications
Please review the attached AGENT.md files and flag any questions before beginning. Specifically:

Confirm MeetingGenius tech stack versions in Section 5.1
Confirm email service provider for task notifications and passwordless auth links
Confirm VPS specs — Node.js version, available ports, and whether PM2 or similar is already in use
Confirm Mattermost bot user can be created with outgoing webhook and REST API posting permissions
Confirm Claude API key is available or will be provisioned by ASC Creative before Phase 1 begins
Review module permissions table in meetinggenius/AGENT.md — flag any boundaries that do not match the actual codebase
Flag any concerns about ASC Agent Service architecture before build begins — your input on the six-module structure is welcome
