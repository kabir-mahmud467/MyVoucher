import { db } from './database';

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const setting = await db.settings.get(key);
  return setting?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ id: key, key, value });
}

export async function getMetadata(key: string): Promise<string | undefined> {
  const item = await db.metadata.get(key);
  return item?.value;
}

export async function setMetadata(key: string, value: string): Promise<void> {
  await db.metadata.put({ id: key, key, value });
}
