import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import projectRoutes from './routes/projectRoutes';
import teamRoutes from './routes/teamRoutes';
import mentorRoutes from './routes/mentorRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import adminRoutes from './routes/adminRoutes';
import { setupSocketIO } from './sockets/chatHandler';

import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/mentor-requests', mentorRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstone Hub API service active with live Supabase database.', timestamp: new Date() });
});

// Socket.IO Setup
setupSocketIO(io);

export { app, server };
