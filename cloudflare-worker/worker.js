/**
 * CineVault Drive Index — Cloudflare Worker
 *
 * Provides two endpoints for public Google Drive folders:
 *   GET /list?id=FOLDER_ID    → JSON array of files/folders
 *   GET /stream/FILE_ID       → Proxied video stream (supports Range requests)
 *
 * DEPLOYMENT (one-time, ~2 minutes):
 *   1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 *   2. Name it "drive-index" → Deploy
 *   3. Click "Edit Code", paste this entire file, click "Deploy"
 *   4. Your worker URL: https://drive-index.<your-subdomain>.workers.dev
 *   5. Set DRIVE_WORKER_URL env var in your backend to that URL
 *
 * No API key or Google auth needed — works with any PUBLIC folder.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // ── LIST folder contents ──
      if (url.pathname === '/list') {
        const folderId = url.searchParams.get('id');
        if (!folderId) {
          return jsonResponse({ error: 'Missing ?id= parameter' }, 400);
        }
        const files = await listFolder(folderId);
        return jsonResponse(files);
      }

      // ── STREAM a file ──
      if (url.pathname.startsWith('/stream/')) {
        const fileId = url.pathname.split('/stream/')[1];
        if (!fileId) {
          return jsonResponse({ error: 'Missing file ID in path' }, 400);
        }
        return streamFile(fileId, request);
      }

      // ── Health check ──
      if (url.pathname === '/') {
        return jsonResponse({ status: 'ok', service: 'CineVault Drive Index' });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal error' }, 500);
    }
  },
};

/* ================================================================
 *  LIST — Scan a public Google Drive folder
 * ================================================================ */

async function listFolder(folderId) {
  // Layer 1: Embedded folder view (most reliable from Cloudflare)
  let files = await tryEmbeddedView(folderId);
  if (files.length > 0) return files;

  // Layer 2: Standard Drive page with JS blob parsing
  files = await tryStandardPage(folderId);
  if (files.length > 0) return files;

  // Layer 3: Mobile-style user agent on alternate path
  files = await tryMobilePage(folderId);
  if (files.length > 0) return files;

  throw new Error('Could not list folder contents. Ensure the folder is shared as "Anyone with the link".');
}

async function tryEmbeddedView(folderId) {
  const res = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
    { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' },
  );
  if (!res.ok) return [];
  const html = await res.text();
  return parseEmbeddedHtml(html, folderId);
}

async function tryStandardPage(folderId) {
  const res = await fetch(
    `https://drive.google.com/drive/folders/${folderId}?usp=sharing`,
    {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    },
  );
  if (!res.ok) return [];
  const html = await res.text();
  return parseJsBlobs(html);
}

async function tryMobilePage(folderId) {
  const res = await fetch(
    `https://drive.google.com/drive/u/0/folders/${folderId}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'en',
      },
      redirect: 'follow',
    },
  );
  if (!res.ok) return [];
  const html = await res.text();
  return parseJsBlobs(html);
}

/* -------- Parsers -------- */

function parseEmbeddedHtml(html, parentFolderId) {
  const files = [];
  const seen = new Set();
  let m;

  // Primary: flip-entry blocks — id="entry-ID" … href … flip-entry-title
  // Files: href contains /file/d/ID/
  const fileRe = /\/file\/d\/([\w-]+)\/[\s\S]*?class="flip-entry-title">([^<]+)<\/div>/gi;
  while ((m = fileRe.exec(html)) !== null) {
    const id = m[1];
    const name = m[2].trim();
    if (!seen.has(id)) {
      seen.add(id);
      files.push({ id, name, mimeType: guessMime(name) });
    }
  }

  // Folders: href contains /folders/ID
  const folderRe = /\/folders\/([\w-]+)[\s\S]*?class="flip-entry-title">([^<]+)<\/div>/gi;
  while ((m = folderRe.exec(html)) !== null) {
    const id = m[1];
    const name = m[2].trim();
    if (!seen.has(id) && id !== parentFolderId) {
      seen.add(id);
      files.push({ id, name, mimeType: 'application/vnd.google-apps.folder' });
    }
  }

  // Fallback: id="entry-ID" … flip-entry-title
  if (files.length === 0) {
    const entryRe = /id="entry-([\w-]+)"[\s\S]*?class="flip-entry-title">([^<]+)<\/div>/gi;
    while ((m = entryRe.exec(html)) !== null) {
      const id = m[1];
      const name = m[2].trim();
      if (!seen.has(id) && id !== parentFolderId) {
        seen.add(id);
        files.push({ id, name, mimeType: guessMime(name) });
      }
    }
  }

  return files;
}

function parseJsBlobs(html) {
  const unescaped = html
    .replace(/\\x([\da-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([\da-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

  const files = [];
  const seen = new Set();
  let m;

  // Pattern 1: ["FILE_ID",["FILENAME"]]
  const p1 = /\["([\w-]{25,})",\["([^"]+)"\]/g;
  while ((m = p1.exec(unescaped)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      files.push({ id: m[1], name: m[2], mimeType: guessMime(m[2]) });
    }
  }

  // Pattern 2: ["FILE_ID","FILENAME"]
  if (files.length === 0) {
    const p2 = /\["([\w-]{25,})","([^"]+)"/g;
    while ((m = p2.exec(unescaped)) !== null) {
      if (!seen.has(m[1]) && !m[2].startsWith('http') && m[2].length < 200) {
        seen.add(m[1]);
        files.push({ id: m[1], name: m[2], mimeType: guessMime(m[2]) });
      }
    }
  }

  // Pattern 3: AF_initDataCallback blobs
  if (files.length === 0) {
    const initRe = /AF_initDataCallback\(\{[^}]*data:([\s\S]*?)\}\s*\)\s*;/g;
    while ((m = initRe.exec(html)) !== null) {
      const blob = m[1];
      const idNameRe = /"([\w-]{25,})"[\s,]*"([^"]{1,200})"/g;
      let sm;
      while ((sm = idNameRe.exec(blob)) !== null) {
        if (!seen.has(sm[1]) && !sm[2].startsWith('http')) {
          seen.add(sm[1]);
          files.push({ id: sm[1], name: sm[2], mimeType: guessMime(sm[2]) });
        }
      }
    }
  }

  // Pattern 4: href-based links
  if (files.length === 0) {
    const hrefFileRe = /href="[^"]*\/file\/d\/([\w-]+)\/[^"]*"[^>]*>\s*([^<]+)/gi;
    while ((m = hrefFileRe.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        files.push({ id: m[1], name: m[2].trim(), mimeType: guessMime(m[2].trim()) });
      }
    }
    const hrefFolderRe = /href="[^"]*\/folders\/([\w-]+)[^"]*"[^>]*>\s*([^<]+)/gi;
    while ((m = hrefFolderRe.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        files.push({ id: m[1], name: m[2].trim(), mimeType: 'application/vnd.google-apps.folder' });
      }
    }
  }

  return files;
}

/* ================================================================
 *  STREAM — Proxy a Google Drive file (supports Range requests)
 * ================================================================ */

async function streamFile(fileId, request) {
  // Step 1: Get the direct download URL (handle virus-scan confirmation)
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

  const headers = {
    'User-Agent': UA,
    Cookie: 'download_warning_token=1; CONSENT=PENDING+999',
  };

  // Forward Range header from the client (ExoPlayer sends these)
  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    headers['Range'] = rangeHeader;
  }

  const driveRes = await fetch(downloadUrl, {
    headers,
    redirect: 'follow',
  });

  // Detect HTML error pages (quota exceeded, file not found, etc.)
  const ct = driveRes.headers.get('Content-Type') || '';
  if (ct.includes('text/html')) {
    // Google returned an HTML error page instead of video data
    const bodyText = await driveRes.text();
    if (bodyText.includes('Quota exceeded') || bodyText.includes('you can\u0027t view')) {
      return jsonResponse(
        { error: 'Google Drive quota exceeded. Try again later.' },
        503,
      );
    }
    return jsonResponse(
      { error: 'Google Drive returned an error page instead of video.' },
      502,
    );
  }

  // Reject suspiciously small files (likely error pages)
  const contentLength = driveRes.headers.get('Content-Length');
  if (contentLength && !rangeHeader && Number(contentLength) < 10000) {
    return jsonResponse(
      { error: `File too small (${contentLength} bytes) — likely not a valid video.` },
      502,
    );
  }

  // Build response headers
  const responseHeaders = new Headers(CORS_HEADERS);
  responseHeaders.set('Accept-Ranges', 'bytes');

  // Forward important headers from Google
  const forwardHeaders = [
    'Content-Type',
    'Content-Length',
    'Content-Range',
    'Content-Disposition',
  ];
  for (const h of forwardHeaders) {
    const val = driveRes.headers.get(h);
    if (val) responseHeaders.set(h, val);
  }

  // Default to video/mp4 if Content-Type is generic
  const ct = driveRes.headers.get('Content-Type') || '';
  if (ct === 'application/octet-stream' || !ct) {
    responseHeaders.set('Content-Type', 'video/mp4');
  }

  // Cache for 1 hour at the edge
  responseHeaders.set('Cache-Control', 'public, max-age=3600');

  return new Response(driveRes.body, {
    status: driveRes.status,
    headers: responseHeaders,
  });
}

/* ================================================================
 *  HELPERS
 * ================================================================ */

function guessMime(name) {
  if (/\.mp4$/i.test(name)) return 'video/mp4';
  if (/\.mkv$/i.test(name)) return 'video/x-matroska';
  if (/\.avi$/i.test(name)) return 'video/avi';
  if (/\.mov$/i.test(name)) return 'video/quicktime';
  if (/\.webm$/i.test(name)) return 'video/webm';
  if (/\.ts$/i.test(name)) return 'video/mp2t';
  if (/\.m4v$/i.test(name)) return 'video/mp4';
  if (!/\.\w+$/.test(name)) return 'application/vnd.google-apps.folder';
  return 'application/octet-stream';
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
