import { app } from '../backend/src/server';
import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  return app(req, res);
}
