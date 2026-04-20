const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.tsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

const files = getFiles('./client/src/pages');
const results = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const regex = /<PageHeader[^>]*title=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({ file, original: match[1] });
  }
}

console.log(JSON.stringify(results, null, 2));
