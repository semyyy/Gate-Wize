import { Client } from 'minio';

const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
const port = Number(process.env.MINIO_PORT ?? 9000);
const accessKey = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
const useSSL = (process.env.MINIO_USE_SSL ?? 'false') === 'true';
const bucket = process.env.MINIO_BUCKET ?? 'forms';

export const client = new Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey,
  secretKey,
});

export async function ensureBucket() {
  const exists = await client.bucketExists(bucket);
  if (!exists) await client.makeBucket(bucket);
}

export async function putJSON(key: string, obj: unknown) {
  await ensureBucket();
  const buf = Buffer.from(JSON.stringify(obj));
  return client.putObject(bucket, key, buf);
}

export async function getJSON(key: string) {
  await ensureBucket();
  try {
    const stream = await client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    const buf = Buffer.concat(chunks);
    return JSON.parse(buf.toString('utf-8'));
  } catch (e: any) {
    if (e.code === 'NoSuchKey') return null;
    throw e;
  }
}
