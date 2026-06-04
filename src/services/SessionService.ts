import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom ID generation (no crypto dependency)
function generateSimpleId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  const random2 = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}-${random2}`;
}

export interface Session {
  id: string;
  userId: string;
  username: string;
  token: string;
  loginTime: number;
  lastActivity: number;
  expiresAt: number;
}

const SESSION_STORAGE_KEY = 'visorai_session_v1';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

async function getSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as Session;

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[SessionService] Error reading session:', error);
    return null;
  }
}

export async function createSession(
  userId: string,
  username: string
): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: generateSimpleId(),
    userId,
    username,
    token: generateSimpleId(),
    loginTime: now,
    lastActivity: now,
    expiresAt: now + SESSION_TIMEOUT,
  };

  try {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log('[SessionService] Session created:', userId);
  } catch (error) {
    console.error('[SessionService] Error creating session:', error);
  }

  return session;
}

export async function getCurrentSession(): Promise<Session | null> {
  const session = await getSession();
  if (session) {
    // Update last activity
    session.lastActivity = Date.now();
    try {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('[SessionService] Error updating activity:', error);
    }
  }
  return session;
}

export async function isSessionValid(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('[SessionService] Session cleared');
  } catch (error) {
    console.error('[SessionService] Error clearing session:', error);
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.userId || null;
}

export async function getSessionUsername(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.username || null;
}

export async function validateToken(token: string): Promise<boolean> {
  const session = await getSession();
  return session?.token === token;
}

export async function extendSession(): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session) return false;

    session.expiresAt = Date.now() + SESSION_TIMEOUT;
    session.lastActivity = Date.now();

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('[SessionService] Error extending session:', error);
    return false;
  }
}

export async function getSessionInfo(): Promise<{ userId: string; username: string; loginTime: number } | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    userId: session.userId,
    username: session.username,
    loginTime: session.loginTime,
  };
}
