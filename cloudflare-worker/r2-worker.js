/**
 * CineVault R2 Media Worker — Cloudflare Worker with R2 Binding
 *
 * Serves video content from Cloudflare R2 with:
 *   - Range request support (seeking in video player)
 *   - CORS headers (cross-origin streaming)
 *   - Content-Type detection
 *   - Cache-Control optimization
 *   - Folder listing for admin browsing
 *
 * DEPLOYMENT:
 *   1. cd cloudflare-worker
 *   2. npx wrangler deploy -c wrangler-r2.toml
 *   3. Worker URL: https://r2-media.<your-subdomain>.workers.dev
 *   4. Set R2_PUBLIC_URL in backend to that URL
 *
 * R2 BUCKET BINDING:
 *   The R2 bucket is bound as "MEDIA" in wrangler-r2.toml
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range, X-Api-Key',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
};

const MIME_TYPES = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  ts: 'video/mp2t',
  m3u8: 'application/vnd.apple.mpegurl',
  flv: 'video/x-flv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  srt: 'text/plain',
  vtt: 'text/vtt',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // ── Health check ──
      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({ status: 'ok', service: 'CineVault R2 Media Worker', bucket: 'velora-media' });
      }

      // ── List folder contents (for admin browsing) ──
      // GET /list?prefix=series/breaking-bad/s01/
      if (url.pathname === '/list') {
        return handleList(url, env);
      }

      // ── Multipart Upload: Create ──
      // POST /upload/multipart/create?key=series/show/s01/e01.mp4
      if (url.pathname === '/upload/multipart/create' && request.method === 'POST') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = url.searchParams.get('key');
        if (!key) return jsonResponse({ error: 'Missing ?key= parameter' }, 400);
        const upload = await env.MEDIA.createMultipartUpload(key);
        return jsonResponse({ uploadId: upload.uploadId, key });
      }

      // ── Multipart Upload: Upload Part ──
      // PUT /upload/multipart/part?key=...&uploadId=...&partNumber=1
      if (url.pathname === '/upload/multipart/part' && request.method === 'PUT') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = url.searchParams.get('key');
        const uploadId = url.searchParams.get('uploadId');
        const partNumber = parseInt(url.searchParams.get('partNumber') || '0');
        if (!key || !uploadId || !partNumber) return jsonResponse({ error: 'Missing key, uploadId, or partNumber' }, 400);
        const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
        const part = await upload.uploadPart(partNumber, request.body);
        return jsonResponse({ partNumber: part.partNumber, etag: part.etag });
      }

      // ── Multipart Upload: Complete ──
      // POST /upload/multipart/complete?key=...&uploadId=...
      if (url.pathname === '/upload/multipart/complete' && request.method === 'POST') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = url.searchParams.get('key');
        const uploadId = url.searchParams.get('uploadId');
        if (!key || !uploadId) return jsonResponse({ error: 'Missing key or uploadId' }, 400);
        const { parts } = await request.json();
        const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
        await upload.complete(parts);
        const publicUrl = `${url.origin}/${key}`;
        return jsonResponse({ success: true, key, publicUrl });
      }

      // ── Multipart Upload: Abort ──
      // DELETE /upload/multipart/abort?key=...&uploadId=...
      if (url.pathname === '/upload/multipart/abort' && request.method === 'DELETE') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = url.searchParams.get('key');
        const uploadId = url.searchParams.get('uploadId');
        if (!key || !uploadId) return jsonResponse({ error: 'Missing key or uploadId' }, 400);
        const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
        await upload.abort();
        return jsonResponse({ success: true });
      }

      // ── Upload file (PUT /upload/series/show/s01/e01.mp4) ──
      if (url.pathname.startsWith('/upload/') && request.method === 'PUT') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = decodeURIComponent(url.pathname.slice('/upload/'.length));
        return handleUpload(request, key, env);
      }

      // ── Create folder (PUT /folder/series/show/s01/) ──
      if (url.pathname.startsWith('/folder/') && request.method === 'PUT') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = decodeURIComponent(url.pathname.slice('/folder/'.length));
        return handleCreateFolder(key, env);
      }

      // ── Delete file (DELETE /delete/series/show/s01/e01.mp4) ──
      if (url.pathname.startsWith('/delete/') && request.method === 'DELETE') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = decodeURIComponent(url.pathname.slice('/delete/'.length));
        return handleDelete(key, env);
      }

      // ── Presigned info (GET /presign?key=series/show/s01/e01.mp4) ──
      // Returns the direct upload URL for the worker
      if (url.pathname === '/presign') {
        if (!checkApiKey(request, env)) return jsonResponse({ error: 'Unauthorized' }, 401);
        const key = url.searchParams.get('key');
        if (!key) return jsonResponse({ error: 'Missing ?key= parameter' }, 400);
        const uploadUrl = `${url.origin}/upload/${encodeURIComponent(key)}`;
        const publicUrl = `${url.origin}/${key}`;
        return jsonResponse({ uploadUrl, key, publicUrl });
      }

      // ── Serve file from R2 (default) ──
      // GET /series/breaking-bad/s01/e01-pilot.mp4
      const key = decodeURIComponent(url.pathname.slice(1)); // remove leading /
      if (!key) {
        return jsonResponse({ error: 'No file path specified' }, 400);
      }

      return handleGet(request, key, env);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal error' }, 500);
    }
  },
};

// ── Serve a file from R2 with Range support ──
async function handleGet(request, key, env) {
  const object = await env.MEDIA.get(key, {
    range: request.headers,
    onlyIf: request.headers,
  });

  if (!object) {
    return jsonResponse({ error: 'Not found', key }, 404);
  }

  const ext = key.split('.').pop()?.toLowerCase() || '';
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const headers = new Headers({
    ...CORS_HEADERS,
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    'ETag': object.httpEtag,
  });

  if (object.range) {
    const { offset, length } = object.range;
    const end = offset + length - 1;
    headers.set('Content-Range', `bytes ${offset}-${end}/${object.size}`);
    headers.set('Content-Length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

// ── List folder contents ──
async function handleList(url, env) {
  const prefix = url.searchParams.get('prefix') || '';
  const delimiter = url.searchParams.get('delimiter') || '/';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '1000'), 1000);

  const listed = await env.MEDIA.list({
    prefix: prefix,
    delimiter: delimiter,
    limit: limit,
  });

  const folders = (listed.delimitedPrefixes || []).map((p) => ({
    name: p.replace(prefix, '').replace(/\/$/, ''),
    path: p,
  }));

  const files = (listed.objects || [])
    .filter((obj) => obj.key !== prefix)
    .map((obj) => ({
      name: obj.key.replace(prefix, ''),
      path: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
    }));

  return jsonResponse({
    prefix,
    folders,
    files,
    truncated: listed.truncated,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// ── Check API key for write operations ──
function checkApiKey(request, env) {
  const apiKey = env.API_KEY || 'velora-r2-default-key';
  const provided = request.headers.get('X-Api-Key') || new URL(request.url).searchParams.get('apiKey');
  return provided === apiKey;
}

// ── Upload a file to R2 ──
async function handleUpload(request, key, env) {
  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
  await env.MEDIA.put(key, request.body, {
    httpMetadata: { contentType },
  });
  const publicUrl = `${new URL(request.url).origin}/${key}`;
  return jsonResponse({ success: true, key, publicUrl, size: request.headers.get('Content-Length') });
}

// ── Create a folder marker ──
async function handleCreateFolder(key, env) {
  const folderKey = key.endsWith('/') ? key : key + '/';
  await env.MEDIA.put(folderKey, '', {
    httpMetadata: { contentType: 'application/x-directory' },
  });
  return jsonResponse({ success: true, path: folderKey });
}

// ── Delete a file from R2 ──
async function handleDelete(key, env) {
  await env.MEDIA.delete(key);
  return jsonResponse({ success: true, deleted: key });
}
