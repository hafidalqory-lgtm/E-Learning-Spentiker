/**
 * Client-side authentication utilities.
 * Note: Pure client-side authentication provides access separation for local school workstations.
 */

export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + 'smpn3kertek_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface UserSession {
  role: 'admin' | 'guru';
  userId?: string;
  name: string;
  username: string;
  subjectIds?: string[];
  classIds?: string[];
  loginTime: string;
}

const SESSION_KEY = 'eujian_auth_session';

export function saveUserSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getUserSession(): UserSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserSession;
  } catch {
    return null;
  }
}

export function clearUserSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
