import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'inteliagent-app/app.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const version = process.argv[2];
if (version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Use uma versão no formato 1.0.2.');
  config.expo.version = version;
}
const latestPath = path.join(process.env.MOBILE_RELEASE_DIR || path.join(root, '.local/mobile-releases'), 'latest.json');
if (fs.existsSync(latestPath)) {
  const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
  config.expo.android.versionCode = Math.max(config.expo.android.versionCode, latest.versionCode + 1);
}
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
