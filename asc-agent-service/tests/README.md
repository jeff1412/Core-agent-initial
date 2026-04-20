# Tests

This folder contains unit tests for all ASC Agent Service modules.

Tests are written alongside each module as phases are completed:

| Phase | Module | Test File |
|-------|--------|-----------|
| Phase 3 | briefValidator.js | briefValidator.test.js |
| Phase 4 | contextAssembler.js | contextAssembler.test.js |
| Phase 5 | claudeClient.js | claudeClient.test.js |
| Phase 6 | githubWriter.js | githubWriter.test.js |
| Phase 7 | mattermostNotifier.js | mattermostNotifier.test.js |
| Phase 8 | escalationHandler.js | escalationHandler.test.js |

Run tests with: `npm test`
