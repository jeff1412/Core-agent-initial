# New Product Onboarding Guide — ASC Agent Service
Version: 1.0 | Owner: ASC Creative (Tim)

Use this guide to onboard a new product (like **JANUS**) into the ASC Agent Service platform.

## Prerequisites
- [ ] Product repository exists in GitHub.
- [ ] You have a dedicated developer channel in Mattermost (e.g., `#janus-dev`).

## 1. Create the Constitution (`AGENT.md`)
Copy the template from `asc-agent-core/AGENT.md.template` into the root of your new product repository.
- **Update Section 3 (Module Permissions):** Define which modules are "Direct Access" and which are "Escalate" (Sensitive).
- **Update Section 4 (Tech Stack):** Specify language, framework, and database.
- **Update Section 6 (PR Template):** Ensure any product-specific testing requirements are added.

## 2. Generate Context Files
Run the documentation builder (or manually create) the following files in the product repo:
- **`CODEBASE.md`**: A map of the repository, key modules, API routes, and DB schemas.
- **`ARCHITECTURE.md`**: A high-level overview of the tech stack, auth logic, and external integrations.

## 3. Register the Product
Add the new product to the `asc-agent-service/products.json` file:
```json
{
  "name": "JANUS",
  "repo": "janus-platform",
  "channel": "janus-dev",
  "agentConfig": "AGENT.md"
}
```

## 4. Setup Mattermost Routing
In the ASC Agent Dashboard:
1. Go to **Products**.
2. Verify that **JANUS** appears and that `AGENT.md` is detected (Green status).
3. Ensure the `MATTERMOST_DEV_CHANNEL_ID` for JANUS is added to your environment variables if using name-to-ID resolution.

## 5. Test with a Documentation Task
Submit a low-risk task first:
- **Brief:** "Product: JANUS, Task Type: Documentation, Description: Update the README with the new logo URL..."
- Watch the **Activity Feed** to ensure the agent fetches the new repo and creates the PR.

## ✅ Onboarding Checklist
- [ ] `AGENT.md` committed?
- [ ] `CODEBASE.md` committed?
- [ ] `ARCHITECTURE.md` committed?
- [ ] Registered in `products.json`?
- [ ] Mattermost channel live?
