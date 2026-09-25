import dotenv from 'dotenv';

dotenv.config();

// Prisma's schema requires a single connection-string env var (DATABASE_URL
// / DIRECT_URL), so rather than keeping that string duplicated on disk in
// .env, it's built here from the discrete DB_* fields — the single source
// of truth — and injected into process.env before anything (Prisma Client
// included) reads it. This only covers the running app process; Prisma CLI
// commands run as separate processes and need the same treatment via
// scripts/prisma-cli.js.
function buildDatabaseUrl(): string {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_SSL } = process.env;
  if (!DB_USER || !DB_PASSWORD || !DB_HOST || !DB_NAME) return '';
  const port = DB_PORT || '5432';
  const params = new URLSearchParams();
  if (DB_SSL === 'true') params.set('sslmode', 'require');
  // Optimize connection pool for Node.js serverless/PaaS (Render & Supabase)
  // Keeps active connections bounded and reduces connect handshake overhead
  params.set('connection_limit', '10');
  params.set('pool_timeout', '10');
  if (port === '6543') params.set('pgbouncer', 'true');

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${port}/${DB_NAME}${queryString}`;
}

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = buildDatabaseUrl();
if (!process.env.DIRECT_URL) process.env.DIRECT_URL = process.env.DATABASE_URL;

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || '',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || '',
    ssl: process.env.DB_SSL === 'true',
  },

  s3: {
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || '',
    bucket: process.env.AWS_BUCKET_NAME || 'store',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || '',
  },

  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderName: process.env.BREVO_SENDER_NAME || 'Kaiira',
    senderEmail: process.env.BREVO_SENDER_EMAIL || '',
  },
};
