import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist-web/', import.meta.url)));
const port = Number(process.env.GAN_PREVIEW_PORT || 8082);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.ttf':'font/ttf', '.png':'image/png', '.ico':'image/x-icon' };
createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let target = resolve(root, `.${path}`);
    if (target !== root && !target.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const info = await stat(target).catch(() => null);
    if (!info?.isFile()) target = resolve(root, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(await readFile(target));
  } catch { res.writeHead(500).end('Run expo export --platform web --output-dir dist-web first.'); }
}).listen(port, '127.0.0.1', () => process.stdout.write(`Gan preview: http://127.0.0.1:${port}\n`));
