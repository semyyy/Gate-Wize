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

import { putJSON, getJSON } from '../minioClient';
import { client as minioClient, ensureBucket } from '../minioClient';

const BUCKET = process.env.MINIO_BUCKET ?? 'forms';

export async function saveForm(id: string, spec: unknown) {
  const key = `form/${id}.json`;
  let toStore: unknown = spec;
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    toStore = { ...(spec as any) };
  }
  await putJSON(key, toStore);
  return { key };
}

export async function loadForm(id: string) {
  const key = `form/${id}.json`;
  const obj = await getJSON(key);
  return obj;
}

export async function formExists(id: string) {
  const existing = await loadForm(id);
  return existing != null;
}

export async function listForms(includeUnpublished = false) {
  await ensureBucket();
  const prefix = 'form/';
  const ids: string[] = [];
  const stream = minioClient.listObjectsV2(BUCKET, prefix, true);
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (obj: any) => {
      if (!obj?.name) return;
      const name: string = obj.name as string;
      if (name.startsWith(prefix) && name.endsWith('.json')) {
        const id = name.substring(prefix.length, name.length - '.json'.length);
        ids.push(id);
      }
    });
    stream.on('end', () => resolve());
    stream.on('error', (e: any) => reject(e));
  });
  // Attach names and status by reading objects (small scale acceptable)
  const meta = [] as Array<{ id: string; name: string; status?: string }>;
  for (const id of ids) {
    try {
      const obj = await loadForm(id);
      const name = obj?.name && typeof obj.name === 'string' ? obj.name : id;
      const status = obj?.status && typeof obj.status === 'string' ? obj.status : undefined;

      // Filter out unpublished forms unless explicitly requested
      if (!includeUnpublished && status !== 'published') {
        continue;
      }

      meta.push({ id, name, status });
    } catch {
      meta.push({ id, name: id });
    }
  }
  return meta;
}

export async function deleteForm(id: string) {
  const key = `form/${id}.json`;
  try {
    await minioClient.removeObject(BUCKET, key);
  } catch (e: any) {
    if (e?.code === 'NoSuchKey') return; // ignore if missing
    throw e;
  }
}
