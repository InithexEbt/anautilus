import { put } from '@vercel/blob';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'reflex2025';

export const config = {
  api: {
    bodyParser: false, // We handle the raw body for file uploads
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Filename');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  // Check auth
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const filename = req.headers['x-filename'] || `img_${Date.now()}.jpg`;
    const contentType = req.headers['content-type'] || 'image/jpeg';

    // Read the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'No se recibio archivo' });
    }

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Archivo muy grande (max 10MB)' });
    }

    // Upload to Vercel Blob
    const blob = await put(`images/${filename}`, buffer, {
      access: 'public',
      contentType,
    });

    return res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
