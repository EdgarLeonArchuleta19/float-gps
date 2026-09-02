import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'demo-jwt-secret',
  googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || '',
  trackerPort: parseInt(process.env.TRACKER_PORT || '12650', 10),
  trackerHost: process.env.TRACKER_HOST || '0.0.0.0',
};
