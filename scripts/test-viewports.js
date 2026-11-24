import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const sampleDir = path.resolve(rootDir, 'sample-exports');
const artifactDir = 'C:\\Users\\MS Infra Works\\.gemini\\antigravity\\brain\\dfaa3310-ec0f-4ef4-88f2-a45c810c6eb9';

if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const port = 5190;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);
  const ext = path.extname(filePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    return res.end(fs.readFileSync(filePath));
  }
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(fs.readFileSync(indexHtml));
  }
  res.writeHead(404);
  res.end('Not found');
});

const viewports = [
  { name: 'compact-mobile-320x640', w: 320, h: 640, mobile: true },
  { name: 'standard-mobile-360x800', w: 360, h: 800, mobile: true },
  { name: 'motorola-edge-393x873', w: 393, h: 873, mobile: true },
  { name: 'large-mobile-430x932', w: 430, h: 932, mobile: true },
  { name: 'tablet-768x1024', w: 768, h: 1024, mobile: false },
  { name: 'desktop-1366x768', w: 1366, h: 768, mobile: false }
];

server.listen(port, () => {
  console.log(`Viewport test server listening on http://localhost:${port}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=9223',
    `http://localhost:${port}/`
  ];
  const proc = spawn(chromePath, args);

  setTimeout(async () => {
    try {
      const res = await fetch('http://localhost:9223/json');
      const tabs = await res.json();
      const tab = tabs.find(t => t.url.includes(`localhost:${port}`));
      if (!tab || !tab.webSocketDebuggerUrl) {
        throw new Error('Could not find Chrome debug tab');
      }

      const ws = new WebSocket(tab.webSocketDebuggerUrl);

      function sendCDP(method, params = {}) {
        return new Promise((resolve) => {
          const id = Math.floor(Math.random() * 1000000);
          const handler = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.id === id) {
              ws.removeEventListener('message', handler);
              resolve(data.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      ws.onopen = async () => {
        console.log('Connected to Chrome DevTools Protocol');
        await sendCDP('Page.enable');
        await sendCDP('DOM.enable');

        for (const vp of viewports) {
          console.log(`Configuring viewport ${vp.name} (${vp.w}x${vp.h}, mobile=${vp.mobile})...`);

          // 1. Set true device emulation metrics
          await sendCDP('Emulation.setDeviceMetricsOverride', {
            width: vp.w,
            height: vp.h,
            deviceScaleFactor: 1,
            mobile: vp.mobile
          });

          // Wait a tick for responsive layout calculation
          await new Promise(r => setTimeout(r, 600));

          // Verify horizontal overflow in DOM
          const evalRes = await sendCDP('Runtime.evaluate', {
            expression: `(() => {
              const docWidth = document.documentElement.clientWidth;
              const winWidth = window.innerWidth;
              const scrollW = document.documentElement.scrollWidth;
              const hasHorizScroll = scrollW > winWidth + 1;

              // Check badges row
              const badgesContainer = document.querySelector('.badges-scroll-row');
              const badgesOverflow = badgesContainer ? getComputedStyle(badgesContainer).overflowX : null;

              // Check mode tabs
              const modeTab = document.querySelector('.mode-tab-btn');
              const modeDirection = modeTab ? getComputedStyle(modeTab).flexDirection : null;

              // Check download button
              const dlBtn = document.querySelector('.download-action-btn-responsive');
              const dlWidth = dlBtn ? dlBtn.offsetWidth : null;
              const dlParentWidth = dlBtn && dlBtn.parentElement ? dlBtn.parentElement.offsetWidth : null;
              const dlClips = dlWidth && dlParentWidth ? dlWidth > dlParentWidth + 1 : false;

              return {
                docWidth,
                winWidth,
                scrollW,
                hasHorizScroll,
                badgesOverflow,
                modeDirection,
                dlClips,
                dlWidth,
                dlParentWidth
              };
            })()`,
            returnByValue: true
          });

          console.log(`DOM Verification for ${vp.name}:`, evalRes?.value);

          // 2. Capture viewport screenshot
          const screenshotRes = await sendCDP('Page.captureScreenshot', {
            format: 'png'
          });

          if (screenshotRes && screenshotRes.data) {
            const buf = Buffer.from(screenshotRes.data, 'base64');
            const outPath = path.join(sampleDir, `horizon-viewport-${vp.name}.png`);
            const artPath = path.join(artifactDir, `viewport-${vp.name}.png`);
            fs.writeFileSync(outPath, buf);
            try { fs.writeFileSync(artPath, buf); } catch {}
            console.log(`Saved screenshot ${vp.name} (${buf.length} bytes)`);
          }

          // 3. Also capture full-page screenshot
          const fullScreenshotRes = await sendCDP('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: true
          });

          if (fullScreenshotRes && fullScreenshotRes.data) {
            const buf = Buffer.from(fullScreenshotRes.data, 'base64');
            const outPath = path.join(sampleDir, `horizon-viewport-${vp.name}-full.png`);
            const artPath = path.join(artifactDir, `viewport-${vp.name}-full.png`);
            fs.writeFileSync(outPath, buf);
            try { fs.writeFileSync(artPath, buf); } catch {}
            console.log(`Saved full screenshot ${vp.name} (${buf.length} bytes)`);
          }
        }

        console.log('All viewports successfully verified and captured via CDP!');
        ws.close();
        proc.kill();
        server.close();
        process.exit(0);
      };
    } catch (err) {
      console.error('CDP runner error:', err);
      proc.kill();
      server.close();
      process.exit(1);
    }
  }, 2000);
});
