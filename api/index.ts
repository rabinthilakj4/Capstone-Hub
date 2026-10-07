import { Request, Response } from 'express';

let appInstance: any = null;
let initError: any = null;

try {
  const { app } = require('../backend/src/server');
  appInstance = app;
} catch (err: any) {
  initError = err;
  console.error('Vercel API top-level load error:', err);
}

export default function handler(req: Request, res: Response) {
  if (!appInstance) {
    try {
      const { app } = require('../backend/src/server');
      appInstance = app;
      initError = null;
    } catch (err: any) {
      initError = err;
    }
  }

  if (initError || !appInstance) {
    return res.status(500).json({
      success: false,
      message: 'Serverless Function Initialization Failed',
      error: initError?.message || (typeof initError === 'string' ? initError : String(initError)),
      stack: process.env.NODE_ENV === 'development' ? initError?.stack : undefined
    });
  }

  return appInstance(req, res);
}
