import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Katalog przechowujący osobne pliki lekcji
const HISTORY_DIR = path.resolve(__dirname, 'history');

function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

function historyApiPlugin() {
  return {
    name: 'history-api',
    configureServer(server: any) {

      // ── GET /api/history ─ lista wszystkich lekcji (posortowana desc po timestamp) ──
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

      // ── /api/history/:id ─ operacje na pojedynczej lekcji ──────────────────────
      server.middlewares.use('/api/history/', (req: any, res: any, next: any) => {
        // wyciągnij id z URL (np. /api/history/abc-123)
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
