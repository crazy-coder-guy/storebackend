import dotenv from 'dotenv';

dotenv.config();

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
    channelBinding: process.env.DB_CHANNEL_BINDING || '',
  },

  s3: {
    endpoint: process.env.AWS_ENDPOINT_URL_S3 || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || '',
    bucket: process.env.AWS_BUCKET_NAME || 'store',
  },
};
