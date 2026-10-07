import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import teamRoutes from './routes/teamRoutes';
import mentorRoutes from './routes/mentorRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Serve static uploaded files if directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));

// Swagger Documentation (Enabled only in local development)
if (process.env.VERCEL !== '1') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const { swaggerDocument } = require('./swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (e) {
    // Ignore in serverless environment
  }
}

// Socket.IO Setup (Enabled only in local development)
if (process.env.VERCEL !== '1') {
  try {
    const { Server } = require('socket.io');
    const { setupSocketIO } = require('./sockets/chatHandler');
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
      }
    });
    setupSocketIO(io);
  } catch (e) {
    // Ignore in serverless environment
  }
}

// API Routes (Mounted under both /api/... and /... for Vercel Serverless compatibility)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/projects', projectRoutes);
app.use('/projects', projectRoutes);

app.use('/api/teams', teamRoutes);
app.use('/teams', teamRoutes);

app.use('/api/mentors', mentorRoutes);
app.use('/mentors', mentorRoutes);

app.use('/api/mentor-requests', mentorRoutes);
app.use('/mentor-requests', mentorRoutes);

app.use('/api/workspace', workspaceRoutes);
app.use('/workspace', workspaceRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'OK', message: 'Capstone Hub API service active with live Supabase database.', timestamp: new Date() });
});

// Global Express Error Handling Middleware (Prevents serverless function crashes)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message });
});

export { app, server };
