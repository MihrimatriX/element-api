import type { Request, Response } from 'express';
import { config } from './config.js';
import { isUuid } from './http.js';

export function readUserId(req: Request): string | undefined {
  const id = req.header('X-User-Id')?.trim();
  return isUuid(id) ? id : undefined;
}

export function requireUser(req: Request, res: Response): string | null {
  if (!requireInternal(req, res)) return null;
  const id = readUserId(req);
  if (!id) {
    res.status(401).json({ error: 'X-User-Id header required' });
    return null;
  }
  return id;
}

export function requireInternal(req: Request, res: Response): boolean {
  const key = req.header('INTERNAL_API_KEY');
  if (!config.internalApiKey || key !== config.internalApiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
