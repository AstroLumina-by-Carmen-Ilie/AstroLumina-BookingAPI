import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const securityHeaders = helmet();

const defaultOrigins = [
  `http://localhost:${env.FRONTEND_SERVER_PORT}`,
  `http://${env.FRONTEND_SERVER_DNS}:${env.FRONTEND_SERVER_PORT}`,
  `https://${env.FRONTEND_SERVER_DNS}:${env.FRONTEND_SERVER_PORT}`,

  `http://localhost:${env.ASTROLOGY_API_SERVER_PORT}`,
  `http://${env.ASTROLOGY_API_SERVER_DNS}:${env.ASTROLOGY_API_SERVER_PORT}`,
  `https://${env.ASTROLOGY_API_SERVER_DNS}:${env.ASTROLOGY_API_SERVER_PORT}`,

  `http://localhost:${env.BOOKING_API_SERVER_PORT}`,
  `http://${env.BOOKING_API_SERVER_DNS}:${env.BOOKING_API_SERVER_PORT}`,
  `https://${env.BOOKING_API_SERVER_DNS}:${env.BOOKING_API_SERVER_PORT}`,

  `http://localhost:${env.PAYMENT_API_SERVER_PORT}`,
  `http://${env.PAYMENT_API_SERVER_DNS}:${env.PAYMENT_API_SERVER_PORT}`,
  `https://${env.PAYMENT_API_SERVER_DNS}:${env.PAYMENT_API_SERVER_PORT}`,
  
  "https://astrolumina.pages.dev",
  "https://development.astrolumina.pages.dev",
  "https://astrolumina.com",
  "https://astrolumina.ro",
];

const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : defaultOrigins;

export const corsMiddleware = cors({ origin: corsOrigins });

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after a minute",
  },
});
