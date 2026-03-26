import { put, list } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join } from 'path';

const BLOB_NAME = 'site-content.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'anautilus2025';

// Load default data
let defaultData = {};
try {
  defaultData = JSON.parse(readFileSync(join(process.cwd(), 'data.default.json'), 'utf-8'));
} catch (e) {
  defaultData = {};
}

async function getBlobUrl() {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length > 0) return blobs[0].url;
  } catch (e) { /* no blob yet */ }
  return null;
}

async function getContent() {
  const url = await getBlobUrl();
  if (url) {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (e) { /* fallback */ }
  }
  return defaultData;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const content = await getContent();
    return res.status(200).json(content);
  }

  if (req.method === 'POST') {
    // Check auth
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    try {
      const data = req.body;

      // Delete old blob if exists
      const oldUrl = await getBlobUrl();

      // Save new content
      const blob = await put(BLOB_NAME, JSON.stringify(data, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });

      return res.status(200).json({ success: true, url: blob.url });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Metodo no permitido' });
}
