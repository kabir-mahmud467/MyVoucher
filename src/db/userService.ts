import { createId } from '../lib/id';
import { validateUserName } from '../lib/validation';
import { db } from './database';
import type { User } from './types';

export async function getActiveUser(): Promise<User | undefined> {
  return db.users.orderBy('createdAt').first();
}

export async function createUser(name: string): Promise<User> {
  const error = validateUserName(name);
  if (error) throw new Error(error);

  return db.transaction('rw', db.users, async () => {
    const existing = await db.users.orderBy('createdAt').first();
    if (existing) {
      throw new Error('এই ডিভাইসে ইতিমধ্যে একটি প্রোফাইল তৈরি করা আছে।');
    }
    const now = new Date().toISOString();
    const user: User = {
      id: createId(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await db.users.add(user);
    return user;
  });
}

export async function updateUserName(name: string): Promise<void> {
  const error = validateUserName(name);
  if (error) throw new Error(error);

  await db.transaction('rw', db.users, async () => {
    const user = await db.users.orderBy('createdAt').first();
    if (!user) throw new Error('ব্যবহারকারীর প্রোফাইল পাওয়া যায়নি।');
    await db.users.update(user.id, {
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    });
  });
}
