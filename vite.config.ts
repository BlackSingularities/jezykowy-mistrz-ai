import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { parseCookie, stringifySetCookie } from 'cookie';

// Katalog przechowujący osobne pliki lekcji
const HISTORY_DIR = path.resolve(__dirname, 'history');
// Katalog z zadaniami generowania (persystencja przez restarty)
const JOBS_DIR = path.resolve(__dirname, 'history', 'jobs');
// Katalog z zestawami ćwiczeń
const EXERCISES_DIR = path.resolve(__dirname, 'history', 'exercises');
// Plik konfiguracyjny serwera (klucz API, wybrany model)
const CONFIG_FILE = path.resolve(__dirname, 'history', '.config.json');
const DB_FILE = path.resolve(__dirname, 'history', 'app.sqlite');

// Bazowy prefiks ścieżki (Vite `base`) - ustawiany przy wdrożeniu pod prefiksem (np. "/jezyki-ai/")
const BASE_PATH = process.env.VITE_BASE_PATH || '/';
const API_PREFIX = BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');


function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
}
function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
}
function ensureExercisesDir() {
  if (!fs.existsSync(EXERCISES_DIR)) fs.mkdirSync(EXERCISES_DIR, { recursive: true });
}

// ─── Server-side config (API key, model) ──────────────────────────────────────

interface ServerConfig {
  apiKey?: string;
  model?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  publicAppUrl?: string;
  registrationCode?: string;
}

function readConfig(): ServerConfig {
  try {
    const fromDb = readSettings();
    if (Object.keys(fromDb).length > 0) return fromDb;
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch { return {}; }
}

function writeConfig(patch: Partial<ServerConfig>): void {
  ensureHistoryDir();
  writeSettings(patch);
}

// ─── SQLite persistence, auth and admin config ───────────────────────────────

type Role = 'admin' | 'user';
type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  approved: number;
  active: number;
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  ensureHistoryDir();
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      approved INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 0,
      activation_token TEXT,
      activation_sent_at INTEGER,
      last_login_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  migrateLegacyConfig();
  return db;
}

function migrateLegacyConfig(): void {
  if (!fs.existsSync(CONFIG_FILE)) return;
  const database = db!;
  const hasSettings = database.prepare('SELECT COUNT(*) AS count FROM settings').get() as { count: number };
  if (hasSettings.count > 0) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    writeSettings(legacy);
  } catch { /* ignore malformed legacy config */ }
}

function readSettings(): ServerConfig {
  const database = db ?? getDb();
  const rows = database.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const cfg: ServerConfig = {};
  for (const row of rows) {
    try {
      (cfg as any)[row.key] = JSON.parse(row.value);
    } catch {
      (cfg as any)[row.key] = row.value;
    }
  }
  return cfg;
}

function writeSettings(patch: Partial<ServerConfig>): void {
  const database = getDb();
  const stmt = database.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = database.transaction((entries: [string, unknown][]) => {
    for (const [key, value] of entries) {
      if (value !== undefined) stmt.run(key, JSON.stringify(value));
    }
  });
  tx(Object.entries(patch));
}

function sendJson(res: any, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
      if (body.length > 10_000_000) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function getOrigin(req: any): string {
  const cfg = readConfig();
  if (cfg.publicAppUrl) return cfg.publicAppUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`.replace(/\/$/, '');
}

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAdmin: user.role === 'admin',
    approved: !!user.approved,
    active: !!user.active,
  };
}

function userCount(): number {
  return (getDb().prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
}

function createSession(userId: number, res: any): void {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expires = now + 30 * 24 * 60 * 60 * 1000;
  getDb().prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expires);
  res.setHeader('Set-Cookie', stringifySetCookie({ name: 'jm_session', value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: API_PREFIX || '/',
    maxAge: 30 * 24 * 60 * 60,
  }));
}

function clearSession(req: any, res: any): void {
  const token = parseCookie(req.headers.cookie || '').jm_session;
  if (token) getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', stringifySetCookie({ name: 'jm_session', value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: API_PREFIX || '/',
    maxAge: 0,
  }));
}

function currentUser(req: any): AuthUser | null {
  const token = parseCookie(req.headers.cookie || '').jm_session;
  if (!token) return null;
  const row = getDb().prepare(`
    SELECT u.id, u.email, u.name, u.role, u.approved, u.active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, Date.now()) as AuthUser | undefined;
  if (!row) return null;
  if (row.active && row.approved && row.role !== 'admin') {
    const admins = (getDb().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number }).count;
    if (admins === 0) {
      getDb().prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(row.id);
      row.role = 'admin';
    }
  }
  return row;
}

async function sendActivationMail(req: any, user: { email: string; name: string; activation_token: string }): Promise<{ sent: boolean; activationUrl: string; error?: string }> {
  const cfg = readConfig();
  const activationUrl = `${getOrigin(req)}${API_PREFIX}/api/auth/activate?token=${encodeURIComponent(user.activation_token)}`;
  if (!cfg.smtpHost || !cfg.smtpFrom) {
    return { sent: false, activationUrl, error: 'SMTP is not configured' };
  }
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort || 587,
    secure: !!cfg.smtpSecure,
    auth: cfg.smtpUser ? { user: cfg.smtpUser, pass: cfg.smtpPass || '' } : undefined,
  });
  await transporter.sendMail({
    from: cfg.smtpFrom,
    to: user.email,
    subject: 'Aktywacja konta - Jezykowy Mistrz AI',
    text: `Czesc ${user.name || ''},\n\nAdministrator zaakceptowal Twoje konto. Aktywuj je tutaj:\n${activationUrl}\n`,
    html: `<p>Czesc ${user.name || ''},</p><p>Administrator zaakceptowal Twoje konto.</p><p><a href="${activationUrl}">Aktywuj konto</a></p>`,
  });
  return { sent: true, activationUrl };
}

// ─── In-memory models cache ────────────────────────────────────────────────────

interface ModelsCache {
  data: unknown[];
  fetchedAt: number;
}
let modelsCache: ModelsCache | null = null;
const MODELS_CACHE_TTL = 10 * 60 * 1000; // 10 minut

// ─── Server-side job types ────────────────────────────────────────────────────

interface ServerJob {
  id: string;
  topic: string;
  targetLang: 'it' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru' | 'pt' | 'el';
  model: string;
  apiKey: string; // stored server-side only, never returned to client
  imageData?: string; // base64 data URL for image-based lessons, stored server-side only
  status: 'pending' | 'running' | 'done' | 'error';
  lessonId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

function genJobId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readJob(id: string): ServerJob | null {
  const file = path.join(JOBS_DIR, `${id}.json`);
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch { return null; }
}

function writeJob(job: ServerJob): void {
  ensureJobsDir();
  fs.writeFileSync(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job), 'utf-8');
}

function deleteJob(id: string): void {
  const file = path.join(JOBS_DIR, `${id}.json`);
  try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
}

function listJobs(): ServerJob[] {
  try {
    ensureJobsDir();
    return fs.readdirSync(JOBS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  } catch { return []; }
}

/** Strip sensitive apiKey and imageData before sending to client */
function safeJob(job: ServerJob): Omit<ServerJob, 'apiKey' | 'imageData'> {
  const { apiKey: _key, imageData: _img, ...safe } = job;
  return safe;
}

// ─── Server-side generation (runs in Node.js / Vite SSR context) ──────────────

async function processJob(job: ServerJob, server: any): Promise<void> {
  writeJob({ ...job, status: 'running', updatedAt: Date.now() });
  try {
    // Use Vite's SSR module loader to transform & execute TypeScript
    const mod = await server.ssrLoadModule('/services/aiService.ts');

    const genFn = job.targetLang === 'en'
      ? mod.generateEnglishLesson
      : job.targetLang === 'fr'
      ? mod.generateFrenchLesson
      : job.targetLang === 'es'
      ? mod.generateSpanishLesson
      : job.targetLang === 'de'
      ? mod.generateGermanLesson
      : job.targetLang === 'cs'
      ? mod.generateCzechLesson
      : job.targetLang === 'ru'
      ? mod.generateRussianLesson
      : job.targetLang === 'pt'
      ? mod.generatePortugueseLesson
      : job.targetLang === 'el'
      ? mod.generateGreekLesson
      : mod.generateLesson;

    // If imageData is present, analyze the image first to derive the topic
    let topicForGeneration = job.topic;
    if (job.imageData) {
      try {
        console.log(`[generator] Analyzing image for job "${job.id}"…`);
        topicForGeneration = await mod.analyzeImageForLesson(
          job.imageData,
          job.targetLang,
          job.topic, // user-provided context hint
          job.apiKey,
          job.model
        );
        console.log(`[generator] Image topic: "${topicForGeneration}"`);
      } catch (imgErr: any) {
        console.warn(`[generator] Image analysis failed, using original topic: ${imgErr?.message}`);
        topicForGeneration = job.topic || 'Untitled lesson';
      }
    }

    const lesson = await genFn(topicForGeneration, job.apiKey, job.model);

    // Persist lesson
    ensureHistoryDir();
    fs.writeFileSync(
      path.join(HISTORY_DIR, `${lesson.id}.json`),
      JSON.stringify(lesson),
      'utf-8'
    );

    writeJob({ ...job, status: 'done', lessonId: lesson.id, updatedAt: Date.now() });
    console.log(`[generator] ✓ Done: "${job.topic}" → ${lesson.id}`);
  } catch (err: any) {
    const msg = err?.message ?? 'Generation failed';
    writeJob({ ...job, status: 'error', error: msg, updatedAt: Date.now() });
    console.error(`[generator] ✗ Error for "${job.topic}":`, msg);
  }
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────

function historyApiPlugin() {
  return {
    name: 'history-api',
    configureServer(server: any) {
      getDb();

      server.middlewares.use(`${API_PREFIX}/api/auth/`, async (req: any, res: any, next: any) => {
        try {
          const route = req.url || '/';

          if (req.method === 'GET' && route === '/me') {
            const user = currentUser(req);
            sendJson(res, 200, { user: user ? publicUser(user) : null });
            return;
          }

          if (req.method === 'POST' && route === '/register') {
            const { email, password, name, registrationCode } = await readBody(req);
            const normalizedEmail = String(email || '').trim().toLowerCase();
            if (!normalizedEmail || !String(password || '').trim()) {
              sendJson(res, 400, { error: 'Email and password are required' });
              return;
            }
            if (String(password).length < 8) {
              sendJson(res, 400, { error: 'Password must be at least 8 characters' });
              return;
            }

            const firstUser = userCount() === 0;
            if (!firstUser) {
              const cfg = readConfig();
              if (cfg.registrationCode && String(registrationCode || '').trim() !== cfg.registrationCode) {
                sendJson(res, 403, { error: 'Invalid registration code' });
                return;
              }
            }
            const passwordHash = await bcrypt.hash(String(password), 12);
            const activationToken = firstUser ? null : crypto.randomBytes(32).toString('hex');
            try {
              const result = getDb().prepare(`
                INSERT INTO users (email, name, password_hash, role, approved, active, activation_token, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                normalizedEmail,
                String(name || '').trim(),
                passwordHash,
                firstUser ? 'admin' : 'user',
                firstUser ? 1 : 0,
                firstUser ? 1 : 0,
                activationToken,
                Date.now()
              );
              if (firstUser) {
                createSession(Number(result.lastInsertRowid), res);
                const user = getDb().prepare('SELECT id, email, name, role, approved, active FROM users WHERE id = ?').get(result.lastInsertRowid) as AuthUser;
                sendJson(res, 200, { user: publicUser(user), message: 'Admin account created' });
                return;
              }
              sendJson(res, 200, { pending: true, message: 'Account registered and waiting for administrator approval' });
            } catch (err: any) {
              if (String(err?.message || '').includes('UNIQUE')) {
                sendJson(res, 409, { error: 'User already exists' });
              } else {
                throw err;
              }
            }
            return;
          }

          if (req.method === 'POST' && route === '/login') {
            const { email, password } = await readBody(req);
            const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase()) as (AuthUser & { password_hash: string }) | undefined;
            if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
              sendJson(res, 401, { error: 'Invalid email or password' });
              return;
            }
            if (!user.approved || !user.active) {
              sendJson(res, 403, { error: user.approved ? 'Account is not active yet' : 'Account is waiting for administrator approval' });
              return;
            }
            const admins = (getDb().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number }).count;
            if (admins === 0) {
              getDb().prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
              user.role = 'admin';
            }
            getDb().prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(Date.now(), user.id);
            createSession(user.id, res);
            sendJson(res, 200, { user: publicUser(user) });
            return;
          }

          if (req.method === 'POST' && route === '/logout') {
            clearSession(req, res);
            sendJson(res, 200, { ok: true });
            return;
          }

          if (req.method === 'GET' && route.startsWith('/activate')) {
            const url = new URL(route, 'http://localhost');
            const token = url.searchParams.get('token') || '';
            const user = getDb().prepare('SELECT id FROM users WHERE activation_token = ? AND approved = 1').get(token) as { id: number } | undefined;
            if (!user) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end('<h1>Link aktywacyjny jest nieprawidlowy albo wygasl.</h1>');
              return;
            }
            getDb().prepare('UPDATE users SET active = 1, activation_token = NULL WHERE id = ?').run(user.id);
            res.statusCode = 302;
            res.setHeader('Location', `${API_PREFIX || '/'}?activated=1`);
            res.end();
            return;
          }

          next();
        } catch (err: any) {
          sendJson(res, 500, { error: err?.message || 'Auth error' });
        }
      });

      server.middlewares.use(`${API_PREFIX}/api/admin/`, async (req: any, res: any, next: any) => {
        try {
          const user = currentUser(req);
          if (!user || user.role !== 'admin') {
            sendJson(res, 403, { error: 'Administrator access required' });
            return;
          }
          const route = req.url || '/';

          if (route === '/users' && req.method === 'GET') {
            const users = getDb().prepare(`
              SELECT id, email, name, role, approved, active, activation_sent_at, last_login_at, created_at
              FROM users
              ORDER BY created_at DESC
            `).all();
            sendJson(res, 200, users);
            return;
          }

          const approveMatch = route.match(/^\/users\/(\d+)\/approve$/);
          if (approveMatch && req.method === 'POST') {
            const id = Number(approveMatch[1]);
            const activationToken = crypto.randomBytes(32).toString('hex');
            getDb().prepare('UPDATE users SET approved = 1, activation_token = COALESCE(activation_token, ?), activation_sent_at = ? WHERE id = ? AND role != ?')
              .run(activationToken, Date.now(), id, 'admin');
            const approved = getDb().prepare('SELECT email, name, activation_token FROM users WHERE id = ?').get(id) as { email: string; name: string; activation_token: string } | undefined;
            if (!approved) {
              sendJson(res, 404, { error: 'User not found' });
              return;
            }
            const mail = await sendActivationMail(req, approved).catch((err: any) => ({ sent: false, activationUrl: '', error: err?.message || 'Could not send mail' }));
            sendJson(res, 200, { ok: true, mail });
            return;
          }

          const roleMatch = route.match(/^\/users\/(\d+)\/role$/);
          if (roleMatch && req.method === 'POST') {
            const { role } = await readBody(req);
            if (role !== 'admin' && role !== 'user') {
              sendJson(res, 400, { error: 'Invalid role' });
              return;
            }
            getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, Number(roleMatch[1]));
            sendJson(res, 200, { ok: true });
            return;
          }

          if (route === '/config' && req.method === 'GET') {
            const cfg = readConfig();
            sendJson(res, 200, {
              hasKey: !!cfg.apiKey,
              model: cfg.model ?? '',
              smtpHost: cfg.smtpHost ?? '',
              smtpPort: cfg.smtpPort ?? 587,
              smtpSecure: !!cfg.smtpSecure,
              smtpUser: cfg.smtpUser ?? '',
              smtpFrom: cfg.smtpFrom ?? '',
              publicAppUrl: cfg.publicAppUrl ?? '',
              hasRegistrationCode: !!cfg.registrationCode,
            });
            return;
          }

          if (route === '/config' && req.method === 'POST') {
            const body = await readBody(req);
            const patch: Partial<ServerConfig> = {};
            for (const key of ['apiKey', 'model', 'smtpHost', 'smtpUser', 'smtpPass', 'smtpFrom', 'publicAppUrl', 'registrationCode'] as const) {
              if (typeof body[key] === 'string' && body[key].trim()) patch[key] = body[key].trim() as any;
            }
            if (body.smtpPort !== undefined) patch.smtpPort = Number(body.smtpPort) || 587;
            if (body.smtpSecure !== undefined) patch.smtpSecure = !!body.smtpSecure;
            writeConfig(patch);
            sendJson(res, 200, { ok: true });
            return;
          }

          next();
        } catch (err: any) {
          sendJson(res, 500, { error: err?.message || 'Admin error' });
        }
      });

      server.middlewares.use(`${API_PREFIX}/api/`, (req: any, res: any, next: any) => {
        const user = currentUser(req);
        if (!user || !user.approved || !user.active) {
          sendJson(res, 401, { error: 'Authentication required' });
          return;
        }
        next();
      });

      // ── On startup: resume any interrupted jobs ─────────────────────────────
      try {
        const stuck = listJobs().filter(j => j.status === 'running' || j.status === 'pending');
        if (stuck.length > 0) {
          console.log(`[generator] Resuming ${stuck.length} interrupted job(s)…`);
          for (const job of stuck) {
            const recovered = { ...job, status: 'pending' as const, updatedAt: Date.now() };
            writeJob(recovered);
            processJob(recovered, server).catch(e =>
              console.error('[generator] Recovery error:', e)
            );
          }
        }
      } catch { /* ignore startup errors */ }

      // ── GET /api/history ────────────────────────────────────────────────────
      server.middlewares.use(`${API_PREFIX}/api/history`, (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          try {
            ensureHistoryDir();
            const files = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.json'));
            const lessons = files
              .map(f => {
                try { return JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, f), 'utf-8')); }
                catch { return null; }
              })
              .filter(Boolean)
              .sort((a: any, b: any) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
            res.end(JSON.stringify(lessons));
          } catch {
            res.end('[]');
          }
          return;
        }
        next();
      });

      // ── /api/history/:id ────────────────────────────────────────────────────
      server.middlewares.use(`${API_PREFIX}/api/history/`, (req: any, res: any, next: any) => {
        const match = req.url?.match(/^\/([^/?]+)$/);
        if (!match) { next(); return; }
        const id = match[1];
        const file = path.join(HISTORY_DIR, `${id}.json`);

        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(file)) { res.statusCode = 404; res.end('null'); return; }
            res.end(fs.readFileSync(file, 'utf-8'));
          } catch { res.statusCode = 500; res.end('null'); }
          return;
        }

        if (req.method === 'POST' || req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              JSON.parse(body); // walidacja
              ensureHistoryDir();
              fs.writeFileSync(file, body, 'utf-8');
              res.end('{"ok":true}');
            } catch { res.statusCode = 400; res.end('{"ok":false}'); }
          });
          return;
        }

        if (req.method === 'DELETE') {
          try {
            if (fs.existsSync(file)) fs.unlinkSync(file);
            res.end('{"ok":true}');
          } catch { res.statusCode = 500; res.end('{"ok":false}'); }
          return;
        }

        res.statusCode = 405;
        res.end('{"ok":false}');
      });

      // ── GET /api/jobs (list) + POST /api/jobs (create) ─────────────────────
      server.middlewares.use(`${API_PREFIX}/api/jobs`, (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          res.end(JSON.stringify(listJobs().map(safeJob)));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c: any) => { body += c; });
          req.on('end', () => {
            try {
              const { topic, targetLang, imageData } = JSON.parse(body);
              // Klucz API i model są zawsze pobierane z konfiguracji serwera.
              const cfg = readConfig();
              const resolvedApiKey = cfg.apiKey;
              if (!targetLang || !resolvedApiKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing required fields: targetLang, apiKey' }));
                return;
              }
              // topic OR imageData must be provided
              if (!topic && !imageData) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing required field: topic or imageData' }));
                return;
              }
              const resolvedModel = cfg.model || 'google/gemini-3-pro-preview';
              const job: ServerJob = {
                id: genJobId(),
                topic: String(topic || ''),
                targetLang: targetLang as 'it' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru' | 'pt' | 'el',
                model: String(resolvedModel),
                apiKey: String(resolvedApiKey),
                ...(imageData ? { imageData: String(imageData) } : {}),
                status: 'pending',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              writeJob(job);
              // Fire-and-forget — generation continues even if client disconnects
              processJob(job, server).catch(e =>
                console.error('[generator] Unhandled error:', e)
              );
              res.end(JSON.stringify({ jobId: job.id }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
          });
          return;
        }

        next();
      });

      // ── GET /api/exercises (list all) ────────────────────────────────────────
      server.middlewares.use(`${API_PREFIX}/api/exercises`, (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          try {
            ensureExercisesDir();
            const files = fs.readdirSync(EXERCISES_DIR).filter((f: string) => f.endsWith('.json'));
            const sets = files
              .map((f: string) => {
                try { return JSON.parse(fs.readFileSync(path.join(EXERCISES_DIR, f), 'utf-8')); }
                catch { return null; }
              })
              .filter(Boolean)
              .sort((a: any, b: any) => (b.generatedAt ?? 0) - (a.generatedAt ?? 0));
            res.end(JSON.stringify(sets));
          } catch {
            res.end('[]');
          }
          return;
        }
        next();
      });

      // ── /api/exercises/:lessonId ─────────────────────────────────────────────
      server.middlewares.use(`${API_PREFIX}/api/exercises/`, (req: any, res: any, next: any) => {
        const match = req.url?.match(/^\/([^/?]+)$/);
        if (!match) { next(); return; }
        const lessonId = match[1];
        const file = path.join(EXERCISES_DIR, `${lessonId}.json`);

        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(file)) { res.statusCode = 404; res.end('null'); return; }
            res.end(fs.readFileSync(file, 'utf-8'));
          } catch { res.statusCode = 500; res.end('null'); }
          return;
        }

        if (req.method === 'POST' || req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              JSON.parse(body); // validation
              ensureExercisesDir();
              fs.writeFileSync(file, body, 'utf-8');
              res.end('{"ok":true}');
            } catch { res.statusCode = 400; res.end('{"ok":false}'); }
          });
          return;
        }

        if (req.method === 'DELETE') {
          try {
            if (fs.existsSync(file)) fs.unlinkSync(file);
            res.end('{"ok":true}');
          } catch { res.statusCode = 500; res.end('{"ok":false}'); }
          return;
        }

        res.statusCode = 405;
        res.end('{"ok":false}');
      });

      // ── DELETE /api/jobs/:id + POST /api/jobs/:id/retry ────────────────────
      server.middlewares.use(`${API_PREFIX}/api/jobs/`, (req: any, res: any, next: any) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'DELETE') {
          const match = req.url?.match(/^\/([^/?]+)$/);
          if (!match) { next(); return; }
          deleteJob(match[1]);
          res.end('{"ok":true}');
          return;
        }

        if (req.method === 'POST') {
          const retryMatch = req.url?.match(/^\/([^/?]+)\/retry$/);
          if (retryMatch) {
            const job = readJob(retryMatch[1]);
            if (!job) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Job not found' }));
              return;
            }
            const retried: ServerJob = {
              ...job,
              status: 'pending',
              error: undefined,
              lessonId: undefined,
              updatedAt: Date.now(),
            };
            writeJob(retried);
            processJob(retried, server).catch(e =>
              console.error('[generator] Retry error:', e)
            );
            res.end(JSON.stringify({ jobId: job.id }));
            return;
          }
        }

        next();
      });

      // ── GET /api/config + POST /api/config ──────────────────────────────────
      server.middlewares.use(`${API_PREFIX}/api/config`, (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        const user = currentUser(req);
        if (!user || user.role !== 'admin') {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'Administrator access required' }));
          return;
        }

        if (req.method === 'GET') {
          const cfg = readConfig();
          // Nigdy nie zwracaj klucza API — tylko czy jest ustawiony
          res.end(JSON.stringify({ hasKey: !!cfg.apiKey, model: cfg.model ?? '' }));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c: any) => { body += c; });
          req.on('end', () => {
            try {
              const { apiKey, model } = JSON.parse(body);
              const patch: Partial<ServerConfig> = {};
              if (typeof apiKey === 'string' && apiKey.trim()) patch.apiKey = apiKey.trim();
              if (typeof model === 'string' && model.trim()) patch.model = model.trim();
              writeConfig(patch);
              res.end('{"ok":true}');
            } catch {
              res.statusCode = 400;
              res.end('{"ok":false}');
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end('{"ok":false}');
      });

      // ── GET /api/models (z cache'em) ─────────────────────────────────────────
      server.middlewares.use(`${API_PREFIX}/api/models`, async (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        if (req.method !== 'GET') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

        const now = Date.now();
        if (modelsCache && now - modelsCache.fetchedAt < MODELS_CACHE_TTL) {
          res.end(JSON.stringify(modelsCache.data));
          return;
        }

        try {
          const cfg = readConfig();
          if (!cfg.apiKey) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: 'API key not configured' }));
            return;
          }
          const mod = await server.ssrLoadModule('/services/aiService.ts');
          const list = await mod.loadModels(cfg.apiKey);
          modelsCache = { data: list, fetchedAt: Date.now() };
          res.end(JSON.stringify(list));
        } catch (err: any) {
          console.error('[models] Error fetching models:', err?.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message ?? 'Failed to load models' }));
        }
      });

      // ── POST /api/correct (korekcja tekstu przez serwer) ─────────────────────
      server.middlewares.use(`${API_PREFIX}/api/correct`, async (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        if (req.method !== 'POST') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

        let body = '';
        req.on('data', (c: any) => { body += c; });
        req.on('end', async () => {
          try {
            const { text, lang, mode } = JSON.parse(body);
            if (!text || !lang || !mode) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing fields: text, lang, mode' }));
              return;
            }
            const cfg = readConfig();
            if (!cfg.apiKey) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'API key not configured' }));
              return;
            }
            const mod = await server.ssrLoadModule('/services/aiService.ts');
            const result = await mod.correctText(text, lang, mode, cfg.apiKey, cfg.model ?? '');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('[correct] Error:', err?.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message ?? 'Correction failed' }));
          }
        });
      });

      // ── POST /api/generate-exercises (generowanie ćwiczeń przez serwer) ─────
      server.middlewares.use(`${API_PREFIX}/api/generate-exercises`, async (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        if (req.method !== 'POST') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

        let body = '';
        req.on('data', (c: any) => { body += c; });
        req.on('end', async () => {
          try {
            const { lesson, count, existingExerciseIds } = JSON.parse(body);
            if (!lesson) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing field: lesson' }));
              return;
            }
            const cfg = readConfig();
            if (!cfg.apiKey) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'API key not configured' }));
              return;
            }
            const mod = await server.ssrLoadModule('/services/exerciseService.ts');
            const exerciseSet = await mod.generateExercisesServer(
              lesson,
              cfg.apiKey,
              cfg.model ?? '',
              count ?? 20,
              existingExerciseIds ?? []
            );
            res.end(JSON.stringify(exerciseSet));
          } catch (err: any) {
            console.error('[exercises] Error:', err?.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message ?? 'Exercise generation failed' }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: BASE_PATH,
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  plugins: [
    react(),
    historyApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
