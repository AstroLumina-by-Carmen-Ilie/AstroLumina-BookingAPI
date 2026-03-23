import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const securityHeaders = helmet();

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3031',
  'https://astrolumina.pages.dev',
  'https://development.astrolumina.pages.dev',
  'https://carmenilie.com',
  'https://www.carmenilie.com',
  'https://carmenilieastrolog.com',
  'https://www.carmenilieastrolog.com',
  'https://astrolumina.com',
  'https://www.astrolumina.com',
];

const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : defaultOrigins;

export const corsMiddleware = cors({ origin: corsOrigins });

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after a minute' },
});
