import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Katalog przechowujący osobne pliki lekcji
const HISTORY_DIR = path.resolve(__dirname, 'history');
// Katalog z zadaniami generowania (persystencja przez restarty)
const JOBS_DIR = path.resolve(__dirname, 'history', 'jobs');
// Katalog z zestawami ćwiczeń
const EXERCISES_DIR = path.resolve(__dirname, 'history', 'exercises');
// Plik konfiguracyjny serwera (klucz API, wybrany model)
const CONFIG_FILE = path.resolve(__dirname, 'history', '.config.json');

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
}

function readConfig(): ServerConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch { return {}; }
}

function writeConfig(patch: Partial<ServerConfig>): void {
  ensureHistoryDir();
  const current = readConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...patch }), 'utf-8');
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
              const { topic, targetLang, model, apiKey: bodyApiKey, imageData } = JSON.parse(body);
              // Klucz API: z body (backward compat) lub z konfiguracji serwera
              const cfg = readConfig();
              const resolvedApiKey = bodyApiKey || cfg.apiKey;
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
              const resolvedModel = model || cfg.model || 'google/gemini-2.5-pro-preview-03-25';
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
      server.middlewares.use('/api/exercises', (req: any, res: any, next: any) => {
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
      server.middlewares.use('/api/exercises/', (req: any, res: any, next: any) => {
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

      // ── GET /api/config + POST /api/config ──────────────────────────────────
      server.middlewares.use('/api/config', (req: any, res: any, next: any) => {
        if (req.url !== '/' && req.url !== '') { next(); return; }
        res.setHeader('Content-Type', 'application/json');

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
      server.middlewares.use('/api/models', async (req: any, res: any, next: any) => {
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
      server.middlewares.use('/api/correct', async (req: any, res: any, next: any) => {
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
      server.middlewares.use('/api/generate-exercises', async (req: any, res: any, next: any) => {
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
