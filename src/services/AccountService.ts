import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FaceEmbedding } from '../types';

// Custom ID generation (no crypto dependency)
function generateSimpleId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  const random2 = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}-${random2}`;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  email: string;
  fullName: string;
  phone?: string;
  department?: string;
  designation?: string;
  faceEmbedding: number[];
  enrollmentDate: string;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
}

const STORAGE_KEY = 'visorai_accounts_v1';

// Hash password (simple implementation - use bcrypt in production)
function hashPassword(password: string): string {
  // Simple hash: In production, use proper bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + '_' + Buffer.from(password).toString('base64');
}

// Verify password
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

async function getAllAccounts(): Promise<UserAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error reading accounts:', error);
    return [];
  }
}

async function saveAccounts(accounts: UserAccount[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export async function createAccount(
  username: string,
  password: string,
  email: string,
  fullName: string,
  faceEmbedding: number[],
  phone?: string,
  department?: string,
  designation?: string
): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
  try {
    // Validate inputs
    if (!username || !password || !email || !fullName) {
      return { success: false, error: 'All required fields must be filled' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Check if username exists
    const accounts = await getAllAccounts();
    if (accounts.find(a => a.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    // Check if email exists
    if (accounts.find(a => a.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already registered' };
    }

    const now = new Date().toISOString();
    const account: UserAccount = {
      id: generateSimpleId(),
      username: username.trim(),
      passwordHash: hashPassword(password),
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      phone: phone?.trim(),
      department: department?.trim(),
      designation: designation?.trim(),
      faceEmbedding,
      enrollmentDate: now,
      active: true,
      createdAt: now,
    };

    accounts.push(account);
    await saveAccounts(accounts);

    console.log('[AccountService] Account created:', account.username);
    return { success: true, account };
  } catch (error: any) {
    console.error('[AccountService] Error creating account:', error);
    return { success: false, error: error.message || 'Failed to create account' };
  }
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const accounts = await getAllAccounts();
    const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());

    if (!account) {
      return { valid: false, error: 'Username not found' };
    }

    if (!account.active) {
      return { valid: false, error: 'Account is inactive' };
    }

    if (!verifyPassword(password, account.passwordHash)) {
      return { valid: false, error: 'Invalid password' };
    }

    return { valid: true, userId: account.id };
  } catch (error: any) {
    console.error('[AccountService] Login verification error:', error);
    return { valid: false, error: error.message || 'Login verification failed' };
  }
}

export async function getUserAccount(userId: string): Promise<UserAccount | null> {
  try {
    const accounts = await getAllAccounts();
    return accounts.find(a => a.id === userId) || null;
  } catch (error) {
    console.error('[AccountService] Error getting account:', error);
    return null;
  }
}

export async function updateLastLogin(userId: string): Promise<void> {
  try {
    const accounts = await getAllAccounts();
    const account = accounts.find(a => a.id === userId);
    if (account) {
      account.lastLogin = new Date().toISOString();
      await saveAccounts(accounts);
    }
  } catch (error) {
    console.error('[AccountService] Error updating login:', error);
  }
}

export async function updateAccount(userId: string, updates: Partial<UserAccount>): Promise<{ success: boolean; error?: string }> {
  try {
    const accounts = await getAllAccounts();
    const account = accounts.find(a => a.id === userId);

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Don't allow changing username or email to existing ones
    if (updates.username && updates.username !== account.username) {
      if (accounts.find(a => a.id !== userId && a.username.toLowerCase() === updates.username!.toLowerCase())) {
        return { success: false, error: 'Username already exists' };
      }
    }

    if (updates.email && updates.email !== account.email) {
      if (accounts.find(a => a.id !== userId && a.email.toLowerCase() === updates.email!.toLowerCase())) {
        return { success: false, error: 'Email already registered' };
      }
    }

    Object.assign(account, updates);
    await saveAccounts(accounts);

    console.log('[AccountService] Account updated:', userId);
    return { success: true };
  } catch (error: any) {
    console.error('[AccountService] Error updating account:', error);
    return { success: false, error: error.message || 'Failed to update account' };
  }
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accounts = await getAllAccounts();
    const account = accounts.find(a => a.id === userId);

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    if (!verifyPassword(oldPassword, account.passwordHash)) {
      return { success: false, error: 'Current password is incorrect' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }

    account.passwordHash = hashPassword(newPassword);
    await saveAccounts(accounts);

    console.log('[AccountService] Password changed:', userId);
    return { success: true };
  } catch (error: any) {
    console.error('[AccountService] Error changing password:', error);
    return { success: false, error: error.message || 'Failed to change password' };
  }
}

export async function getUserFaceEmbedding(userId: string): Promise<number[] | null> {
  try {
    const account = await getUserAccount(userId);
    return account?.faceEmbedding || null;
  } catch (error) {
    console.error('[AccountService] Error getting face embedding:', error);
    return null;
  }
}

export async function deleteAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accounts = await getAllAccounts();
    const index = accounts.findIndex(a => a.id === userId);

    if (index === -1) {
      return { success: false, error: 'Account not found' };
    }

    accounts.splice(index, 1);
    await saveAccounts(accounts);

    console.log('[AccountService] Account deleted:', userId);
    return { success: true };
  } catch (error: any) {
    console.error('[AccountService] Error deleting account:', error);
    return { success: false, error: error.message || 'Failed to delete account' };
  }
}

export async function listAllAccounts(): Promise<UserAccount[]> {
  try {
    return await getAllAccounts();
  } catch (error) {
    console.error('[AccountService] Error listing accounts:', error);
    return [];
  }
}
