import fs from 'fs/promises';
import path from 'path';

const SRC_DIR = './src';
const CSS_COMMENT = '/* © ThinkTech — KalaMitra — 2026 */\n';
const JS_COMMENT = '// © ThinkTech — KalaMitra — 2026\n';

async function walk(dir, fileList = []) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await walk(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function addWatermarks() {
  const files = await walk(SRC_DIR);
  let count = 0;
  for (const file of files) {
    if (
      file.endsWith('.js') ||
      file.endsWith('.jsx') ||
      file.endsWith('.ts') ||
      file.endsWith('.tsx')
    ) {
      let content = await fs.readFile(file, 'utf8');
      if (!content.startsWith(JS_COMMENT.trim())) {
        content = JS_COMMENT + content;
        await fs.writeFile(file, content, 'utf8');
        count++;
      }
    } else if (file.endsWith('.css') || file.endsWith('.scss')) {
      let content = await fs.readFile(file, 'utf8');
      if (!content.startsWith(CSS_COMMENT.trim())) {
        content = CSS_COMMENT + content;
        await fs.writeFile(file, content, 'utf8');
        count++;
      }
    }
  }
  console.log(`Added watermarks to ${count} files.`);
}

addWatermarks().catch(console.error);
