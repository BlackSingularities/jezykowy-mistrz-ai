import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Katalog przechowujący osobne pliki lekcji
const HISTORY_DIR = path.resolve(__dirname, 'history');
// Katalog z zadaniami generowania (persystencja przez restarty)
const JOBS_DIR = path.resolve(__dirname, 'history', 'jobs');

function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
}
function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
}

// ─── Server-side job types ────────────────────────────────────────────────────

interface ServerJob {
  id: string;
  topic: string;
  targetLang: 'it' | 'en' | 'fr' | 'es';
  model: string;
  apiKey: string; // stored server-side only, never returned to client
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

/** Strip sensitive apiKey before sending to client */
function safeJob(job: ServerJob): Omit<ServerJob, 'apiKey'> {
  const { apiKey: _key, ...safe } = job;
  return safe;
}

// ─── Server-side generation (runs in Node.js / Vite SSR context) ──────────────

async function processJob(job: ServerJob, server: any): Promise<void> {
  writeJob({ ...job, status: 'running', updatedAt: Date.now() });
  try {
    // Use Vite's SSR module loader to transform & execute TypeScript
    const mod = await server.ssrLoadModule('/services/geminiService.ts');

    const genFn = job.targetLang === 'en'
      ? mod.generateEnglishLesson
      : job.targetLang === 'fr'
      ? mod.generateFrenchLesson
      : job.targetLang === 'es'
      ? mod.generateSpanishLesson
      : mod.generateLesson;

    const lesson = await genFn(job.topic, job.apiKey, job.model);

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
      server.middlewares.use('/api/history', (req: any, res: any, next: any) => {
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
      server.middlewares.use('/api/history/', (req: any, res: any, next: any) => {
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
      server.middlewares.use('/api/jobs', (req: any, res: any, next: any) => {
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
              const { topic, targetLang, model, apiKey } = JSON.parse(body);
              if (!topic || !targetLang || !apiKey) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing required fields: topic, targetLang, apiKey' }));
                return;
              }
              const job: ServerJob = {
                id: genJobId(),
                topic: String(topic),
                targetLang: targetLang as 'it' | 'en' | 'fr' | 'es',
                model: String(model || 'google/gemini-3-pro-preview'),
                apiKey: String(apiKey),
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

      // ── DELETE /api/jobs/:id + POST /api/jobs/:id/retry ────────────────────
      server.middlewares.use('/api/jobs/', (req: any, res: any, next: any) => {
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
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
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
