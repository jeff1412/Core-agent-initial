'use strict';

/**
 * server.ts — UNIFIED ASC Agent Service
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Modules
import webhookRouter from './routes/webhook';
import { getEvents } from './modules/eventLogger';
import { getPullRequests, PullRequestSummary } from './modules/githubWriter';
import { checkHealth } from './modules/healthChecker';
import { getEscalations, clearEscalation } from './modules/escalationManager';
import { runPipeline, PipelinePayload } from './modules/agentEngine';
import { chatWithGemini, ChatMessage } from './modules/claudeClient';
import { runHeartbeat, isHeartbeatRunning } from './modules/heartbeatRunner';
import { getLatestReport, getReportHistory, getReportById } from './modules/heartbeatStore';
import { getGithubTokenStatusAsync, saveGithubToken, clearGithubToken } from './modules/githubTokenStore';
import cron from 'node-cron';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'asc-agent-service' });
  });

  // Product Registry API
  app.get('/api/products', (req: Request, res: Response) => {
    try {
      const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8'));
      res.json(products);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read product registry' });
    }
  });

  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8'));
      const newProduct = {
        id: req.body.id || req.body.name.toLowerCase().replace(/\s+/g, '-'),
        ...req.body,
        onboarded: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      products.push(newProduct);
      fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2));
      res.status(201).json(newProduct);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update product registry' });
    }
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8'));
      products = products.filter((p: any) => p.id !== id);
      fs.writeFileSync(path.join(__dirname, 'products.json'), JSON.stringify(products, null, 2));
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: 'Failed to update product registry' });
    }
  });

  // GitHub Token API (dashboard-managed, overrides .env when set)
  app.get('/api/github-token', async (req: Request, res: Response) => {
    res.json(await getGithubTokenStatusAsync());
  });

  app.post('/api/github-token', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'token is required' });
      }
      const { username } = await saveGithubToken(token);
      res.json({ success: true, username, status: await getGithubTokenStatusAsync() });
    } catch (e: any) {
      console.error('[GitHub Token API] Save failed:', e.message);
      res.status(400).json({ error: e.message || 'Invalid GitHub token' });
    }
  });

  app.delete('/api/github-token', async (req: Request, res: Response) => {
    clearGithubToken();
    res.json({ success: true, status: await getGithubTokenStatusAsync() });
  });

  // Events API
  app.get('/api/events', (req: Request, res: Response) => {
    res.json(getEvents());
  });

  // Pull Request History API
  app.get('/api/pull-requests', async (req: Request, res: Response) => {
    try {
      const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8'));
      const prPromises = products.map((p: any) => getPullRequests(p.repo, p.owner));
      const results: PullRequestSummary[][] = await Promise.all(prPromises);
      const flattened = results.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(flattened);
    } catch (e: any) {
      console.error('Failed to fetch aggregated PRs:', e.message);
      res.status(500).json({ error: 'Failed to aggregate PR history' });
    }
  });

  // Health Status API
  app.get('/api/status', async (req: Request, res: Response) => {
    const status = await checkHealth();
    res.json(status);
  });

  // Escalation Alerts API
  app.get('/api/escalations', (req: Request, res: Response) => {
    res.json(getEscalations());
  });
  app.delete('/api/escalations/:id', (req: Request, res: Response) => {
    clearEscalation(req.params.id as string);
    res.status(204).end();
  });

  // Agent Chat API (Gemini proxy — key stays server-side)
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages, userMessage, systemPrompt } = req.body;
      if (!userMessage || typeof userMessage !== 'string') {
        return res.status(400).json({ error: 'userMessage is required' });
      }
      const history: ChatMessage[] = Array.isArray(messages) ? messages : [];
      const prompt = systemPrompt || 'You are the ASC Agent, a helpful software development assistant.';
      const text = await chatWithGemini(prompt, history, userMessage);
      res.json({ text });
    } catch (e: any) {
      console.error('[Chat API] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Heartbeat API (repo health reports)
  app.get('/api/heartbeat/latest', (req: Request, res: Response) => {
    const latest = getLatestReport();
    res.json(latest || { empty: true });
  });

  app.get('/api/heartbeat/history', (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 30);
    const history = getReportHistory(limit).map(r => ({
      id: r.id,
      generatedAt: r.generatedAt,
      trigger: r.trigger,
      summary: {
        green: r.products.filter(p => p.status === 'green').length,
        yellow: r.products.filter(p => p.status === 'yellow').length,
        red: r.products.filter(p => p.status === 'red').length,
        products: r.products.map(p => ({ name: p.productName, status: p.status }))
      }
    }));
    res.json(history);
  });

  app.get('/api/heartbeat/:id', (req: Request, res: Response) => {
    const report = getReportById(req.params.id as string);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  });

  app.post('/api/heartbeat/run', async (req: Request, res: Response) => {
    if (isHeartbeatRunning()) {
      return res.status(409).json({ error: 'A heartbeat report is already in progress.' });
    }
    try {
      const report = await runHeartbeat('manual');
      res.json(report);
    } catch (e: any) {
      console.error('[Heartbeat API] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Task Intake API (Web Form)
  app.post('/api/intake', async (req: Request, res: Response) => {
    res.status(200).json({ status: 'accepted', message: 'Task submitted to engine' });
    
    const { product, description, type, taskType, priority, acceptanceCriteria, doNotTouch, referenceFiles } = req.body;
    const finalType = type || taskType || 'Feature';
    
    const simulatedPayload: PipelinePayload = {
      text: `Product: ${product}\nTask Type: ${finalType}\nDescription: ${description}\nAcceptance Criteria: ${acceptanceCriteria || 'N/A'}\nPriority: ${priority}\nDo Not Touch: ${doNotTouch || 'None'}\nReference Files: ${referenceFiles || 'None'}`,
      post_id: 'web-form-' + Date.now().toString(36),
      channel_id: 'dashboard-ui'
    };

    runPipeline(simulatedPayload).catch(err => console.error('Intake failed:', err));
  });

  // Primary Webhook Entry Point
  app.use('/webhook', webhookRouter);

  // ─────────────────────────────────────────────
  // Unified Dashboard Serving
  // ─────────────────────────────────────────────
  const clientRoot = path.join(__dirname, 'client');
  const distPath = path.join(clientRoot, 'dist');
  
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(path.join(clientRoot, 'index.html'))) {
    console.log('🔧 Starting in UNIFIED DEVELOPMENT mode...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: clientRoot,
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req: Request, res: Response) => {
      // Only serve index.html for HTML requests, let others fall through (triggering 404)
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        try {
          let template = fs.readFileSync(path.join(clientRoot, 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e: any) {
          res.status(500).end(e.message);
        }
      } else {
        res.status(404).end();
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`\n✅ WEBSITE IS LIVE AT: http://localhost:${PORT}\n`);

    const cronExpr = process.env.HEARTBEAT_REPORT_CRON || '0 9 * * 1';
    if (cron.validate(cronExpr)) {
      cron.schedule(cronExpr, () => {
        if (isHeartbeatRunning()) return;
        runHeartbeat('scheduled').catch(err =>
          console.error('[Heartbeat Cron] Failed:', err.message)
        );
      });
      console.log(`[Heartbeat] Scheduled reports: ${cronExpr}`);
    } else {
      console.warn(`[Heartbeat] Invalid HEARTBEAT_REPORT_CRON: ${cronExpr}`);
    }
  });
}

startServer().catch(err => console.error(err));
