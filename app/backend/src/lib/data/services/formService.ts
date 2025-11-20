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

export async function listForms() {
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
  // Attach names by reading objects (small scale acceptable)
  const meta = [] as Array<{ id: string; name: string }>;
  for (const id of ids) {
    try {
      const obj = await loadForm(id);
      const name = obj?.name && typeof obj.name === 'string' ? obj.name : id;
      meta.push({ id, name });
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
