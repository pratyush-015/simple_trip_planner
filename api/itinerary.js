// Vercel serverless entry point (same logic as server/index.js).
import { handleItinerary } from '../server/handler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: { code: 'method', message: 'Use POST.' } });
  }
  const { status, body } = await handleItinerary(req.body);
  res.status(status).json(body);
}
