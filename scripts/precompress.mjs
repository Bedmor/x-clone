import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';

const root = process.cwd();
const targets = [
  path.join(root, '.next', 'static'),
  path.join(root, '.next', 'server'),
  path.join(root, 'public'),
];

const exts = new Set(['.js', '.css', '.html', '.json', '.svg', '.xml', '.txt', '.map', '.ico']);

async function walk(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.has(ext)) {
          await compress(full);
        }
      }
    }
  } catch (err) {
    // ignore missing directories
  }
}

async function compress(file) {
  try {
    const data = await fs.readFile(file);
    // Brotli
    const brotli = await new Promise((res, rej) => {
      zlib.brotliCompress(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }, (err, out) => {
        if (err) rej(err);
        else res(out);
      });
    });
    await fs.writeFile(file + '.br', brotli);
    // Gzip
    const gz = await new Promise((res, rej) => {
      zlib.gzip(data, { level: zlib.constants.Z_BEST_COMPRESSION }, (err, out) => {
        if (err) rej(err);
        else res(out);
      });
    });
    await fs.writeFile(file + '.gz', gz);
    console.log('Compressed', file);
  } catch (err) {
    console.error('Failed to compress', file, err.message);
  }
}

async function main() {
  for (const t of targets) {
    await walk(t);
  }
  console.log('Precompress complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
