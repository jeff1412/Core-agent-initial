import 'dotenv/config';
import { runPipeline } from '../modules/agentEngine';

const mockPayload = {
  text: `
Product: MeetingGenius
Task Type: Documentation
Description: Update the project README with current technology stack overview.
Acceptance Criteria: README shows TypeScript, React, and Node.js versions.
Priority: Medium
Do Not Touch: Auth
Reference Files: README.md
  `.trim(),
  post_id: 'test-task-' + Date.now(),
  channel_id: 'agent-intake'
};

async function test() {
  console.log('🚀 Simulating End-to-End Task for MeetingGenius...');
  await runPipeline(mockPayload);
  console.log('✅ Simulation triggered.');
}

test().catch(console.error);
