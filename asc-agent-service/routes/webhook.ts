'use strict';

/**
 * routes/webhook.ts — Mattermost Webhook Receiver
 */

import express, { Request, Response, Router } from 'express';
import { runPipeline } from '../modules/agentEngine';

const router: Router = express.Router();

// POST /webhook
router.post('/', (req: Request, res: Response) => {
  res.status(200).json({ text: 'ASC Agent Service received your request. Processing...' });

  runPipeline(req.body).catch((err: any) => {
    console.error(`[Webhook] Engine failed:`, err.message);
  });
});

export default router;
