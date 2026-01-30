/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
