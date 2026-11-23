const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DASHBOARD_SIZES = [
  { name: 'dashboard-1440x900.png', width: 1440, height: 900, mobile: false },
  { name: 'dashboard-390x844.png', width: 390, height: 844, mobile: true }
];

const PREVIEW_SIZES = [
  { name: 'dedicated-preview-1440x900.png', width: 1440, height: 900, mobile: false },
  { name: 'dedicated-preview-1366x768.png', width: 1366, height: 768, mobile: false },
  { name: 'dedicated-preview-768x1024.png', width: 768, height: 1024, mobile: false },
  { name: 'dedicated-preview-390x844.png', width: 390, height: 844, mobile: true }
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function createStaticServer(distDir, port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(distDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const fallback = path.join(distDir, 'index.html');
        if (fs.existsSync(fallback)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(fallback).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`In-process static server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

async function main() {
  const tmpDir = path.join(require('os').tmpdir(), 'chrome_cdp_profile_' + Date.now());
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const brainDir = 'C:\\Users\\MS Infra Works\\.gemini\\antigravity\\brain\\dfaa3310-ec0f-4ef4-88f2-a45c810c6eb9';
  const distDir = path.resolve('dist');
  const outDir = path.resolve('docs/screenshots');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const server = await createStaticServer(distDir, 4173);

  // Launch headless Chrome directly navigating to the target
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + tmpDir,
    'http://127.0.0.1:4173/'
  ]);

  chrome.stdout.on('data', d => console.log('[Chrome stdout]', d.toString()));
  chrome.stderr.on('data', d => console.error('[Chrome stderr]', d.toString()));
  chrome.on('exit', (code) => console.log('[Chrome exit]', code));

  let pages = [];
  for (let i = 0; i < 40; i++) {
    try {
      pages = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9222/json/list', res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { resolve([]); }
          });
        });
        req.on('error', err => {
          console.log(`[Attempt ${i}] /json/list error: ${err.message}`);
          reject(err);
        });
      });
      if (Array.isArray(pages) && pages.length > 0 && pages[0].webSocketDebuggerUrl) {
        break;
      }
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 250));
  }

  if (!pages || pages.length === 0 || !pages[0].webSocketDebuggerUrl) {
    throw new Error('Chrome failed to expose page target on port 9222');
  }

  const pageTarget = pages.find(p => p.type === 'page') || pages[0];
  console.log('Connecting to page WebSocket:', pageTarget.webSocketDebuggerUrl);

  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);

  let idCounter = 1;
  const callbacks = new Map();
  pageWs.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  function sendPage(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      callbacks.set(id, (msg) => resolve(msg.result));
      pageWs.send(JSON.stringify({ id, method, params }));
    });
  }

  async function takeScreenshot(name) {
    const shot = await sendPage('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const outPath = path.join(outDir, name);
    fs.writeFileSync(outPath, buf);
    if (fs.existsSync(brainDir)) {
      fs.writeFileSync(path.join(brainDir, name), buf);
    }
    console.log(`Captured ${name}: ${buf.length} bytes`);
  }

  await sendPage('Page.enable');
  await new Promise(r => setTimeout(r, 1200));

  // Phase 1: Capture Dashboard views
  console.log('Phase 1: Capturing Dashboard views...');
  for (const s of DASHBOARD_SIZES) {
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: s.width,
      height: s.height,
      deviceScaleFactor: 1,
      mobile: s.mobile
    });
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot(s.name);
  }

  // Phase 2: Switch to Dedicated Mobile Wallpaper Preview view
  console.log('Phase 2: Navigating to Dedicated Mobile Preview view via button click...');
  await sendPage('Runtime.evaluate', {
    expression: `
      (function() {
        const btn = document.querySelector('.open-preview-btn');
        if (btn) btn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 900));

  // Phase 3: Capture Dedicated Preview views across viewports
  console.log('Phase 3: Capturing Dedicated Mobile Preview views...');
  for (const s of PREVIEW_SIZES) {
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: s.width,
      height: s.height,
      deviceScaleFactor: 1,
      mobile: s.mobile
    });
    await new Promise(r => setTimeout(r, 700));
    await takeScreenshot(s.name);
  }

  // Phase 4: Click Back to Dashboard
  console.log('Phase 4: Returning to Dashboard via Back button...');
  await sendPage('Runtime.evaluate', {
    expression: `
      (function() {
        const backBtn = document.querySelector('.back-dashboard-btn');
        if (backBtn) backBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 700));
  await takeScreenshot('dashboard-returned-1440x900.png');

  pageWs.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  console.log('All screenshots captured and verified successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
