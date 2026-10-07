import { Request, Response } from 'express';

let appInstance: any = null;
let initError: any = null;

function loadBackendApp() {
  if (appInstance) return appInstance;
  try {
    // Import compiled backend server dist
    const { app } = require('../backend/dist/server');
    appInstance = app;
    return appInstance;
  } catch (err: any) {
    // Fallback to source
    try {
      const { app } = require('../backend/src/server');
      appInstance = app;
      return appInstance;
    } catch (err2: any) {
      initError = err2 || err;
      console.error('Vercel API load error:', initError);
      return null;
    }
  }
}

export default function handler(req: Request, res: Response) {
  const expressApp = loadBackendApp();

  if (!expressApp) {
    return res.status(500).json({
      success: false,
      message: 'Serverless Function Initialization Failed',
      error: initError?.message || String(initError),
      stack: initError?.stack
    });
  }

  return expressApp(req, res);
}
