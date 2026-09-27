import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';

const s3Client = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
  forcePathStyle: true,
});

// Supabase's S3-compatible endpoint (used above for the upload itself) is
// not a browser-readable URL — it requires signed S3 requests. Public reads
// go through Supabase's own object API on the main project domain instead:
// https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
const publicBaseUrl = config.s3.endpoint.replace(
  /^https?:\/\/([^.]+)\.storage\.supabase\.co\/storage\/v1\/s3$/,
  'https://$1.supabase.co/storage/v1/object/public'
);

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${publicBaseUrl}/${config.s3.bucket}/${key}`;
}
