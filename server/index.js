import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { handleItinerary } from './handler.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use(express.json({ limit: '10kb' }));

app.post('/api/itinerary', async (req, res) => {
  const { status, body } = await handleItinerary(req.body);
  res.status(status).json(body);
});

// Malformed JSON bodies etc.
app.use((err, _req, res, next) => {
  if (err) return res.status(400).json({ error: { code: 'bad_request', message: 'Invalid request body.' } });
  next();
});

// If the app has been built (npm run build), serve it from the same server.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.get('/', (_req, res) => res.type('text').send(
    'Trip Planner API is running. Open http://localhost:5173 for the app during development. Use npm run serve to build and serve the app here.'
  ));
}

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
