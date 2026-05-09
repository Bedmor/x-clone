import fs from 'fs/promises';
import path from 'path';

const routersDir = path.join(process.cwd(), 'src', 'server', 'api', 'routers');

async function main() {
  try {
    const files = await fs.readdir(routersDir);
    const results = [];
    for (const file of files) {
      const full = path.join(routersDir, file);
      const stat = await fs.stat(full);
      if (stat.isFile()) {
        results.push({ file, size: stat.size });
      }
    }
    results.sort((a, b) => b.size - a.size);
    for (const r of results) {
      console.log(`${r.file}\t${(r.size / 1024).toFixed(1)} KB`);
    }
  } catch (err) {
    console.error('Could not list routers:', err.message);
    process.exit(1);
  }
}

main();
