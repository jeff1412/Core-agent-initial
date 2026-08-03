'use strict';

/**
 * modules/authStore.ts — Dashboard user accounts and sessions
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_PATH = path.join(__dirname, '..', 'auth-users.json');
const SESSIONS_PATH = path.join(__dirname, '..', 'auth-sessions.json');
const SESSION_DAYS = 7;

export interface AuthUser {
  email: string;
  name: string;
  passwordHash: string;
}

interface SessionRecord {
  email: string;
  createdAt: string;
  expiresAt: string;
}

function readUsers(): AuthUser[] {
  if (!fs.existsSync(USERS_PATH)) {
    const defaultPassword = bcrypt.hashSync('123456', 10);
    const users: AuthUser[] = [
      { email: 'jeffrey@asccreative.com', name: 'Jeffrey', passwordHash: defaultPassword },
      { email: 'tim@asccreative.com', name: 'Tim', passwordHash: defaultPassword }
    ];
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
    return users;
  }
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

function writeUsers(users: AuthUser[]): void {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function readSessions(): Record<string, SessionRecord> {
  try {
    if (fs.existsSync(SESSIONS_PATH)) {
      return JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf-8'));
    }
  } catch {
    console.warn('[Auth] Could not read sessions file');
  }
  return {};
}

function writeSessions(sessions: Record<string, SessionRecord>): void {
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(sessions, null, 2));
}

function cleanExpiredSessions(sessions: Record<string, SessionRecord>): Record<string, SessionRecord> {
  const now = Date.now();
  const cleaned: Record<string, SessionRecord> = {};
  for (const [token, session] of Object.entries(sessions)) {
    if (new Date(session.expiresAt).getTime() > now) {
      cleaned[token] = session;
    }
  }
  return cleaned;
}

export function login(email: string, password: string): { token: string; user: { email: string; name: string } } {
  const normalized = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === normalized);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw new Error('Invalid email or password');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const sessions = cleanExpiredSessions(readSessions());
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  sessions[token] = { email: user.email, createdAt: new Date().toISOString(), expiresAt };
  writeSessions(sessions);

  return { token, user: { email: user.email, name: user.name } };
}

export function logout(token: string): void {
  const sessions = readSessions();
  delete sessions[token];
  writeSessions(sessions);
}

export function getSessionUser(token: string | undefined): { email: string; name: string } | null {
  if (!token) return null;
  const sessions = cleanExpiredSessions(readSessions());
  const session = sessions[token];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    delete sessions[token];
    writeSessions(sessions);
    return null;
  }
  const users = readUsers();
  const user = users.find(u => u.email === session.email);
  if (!user) return null;
  return { email: user.email, name: user.name };
}

export function changePassword(email: string, currentPassword: string, newPassword: string): void {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters');
  }
  const users = readUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) throw new Error('User not found');
  if (!bcrypt.compareSync(currentPassword, users[idx].passwordHash)) {
    throw new Error('Current password is incorrect');
  }
  users[idx].passwordHash = bcrypt.hashSync(newPassword, 10);
  writeUsers(users);
}
