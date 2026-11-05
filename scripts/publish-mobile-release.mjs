import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const apk = option('--apk');
if (!apk) throw Error('Uso: node scripts/publish-mobile-release.mjs --apk CAMINHO.apk [--notes "Novidades"]');
const source = path.resolve(apk);
if (path.extname(source).toLowerCase() !== '.apk') throw Error('Informe um arquivo .apk.');
const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA, 'Android/Sdk');
const tools = path.join(sdk, 'build-tools', fs.readdirSync(path.join(sdk, 'build-tools')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))[0]);
const metadata = execFileSync(path.join(tools, 'aapt.exe'), ['dump', 'badging', source], { encoding: 'utf8', windowsHide: true });
const identity = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(metadata);
if (!identity || identity[1] !== 'com.rian3054.inteliagentapp' || !/^[\d.]+$/.test(identity[3])) throw Error('APK inválido ou de outro aplicativo.');
if (/application-debuggable/m.test(metadata)) throw Error('Publique o APK independente de release, não o APK de desenvolvimento.');
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/java.exe') : 'java';
const signature = execFileSync(java, ['-jar', path.join(tools, 'lib/apksigner.jar'), 'verify', '--print-certs', source], { encoding: 'utf8', windowsHide: true });
// Build-tools 37 uses "V2 Signer:"; older versions use "Signer #1".
const certificates = [...new Set([...signature.matchAll(/certificate SHA-256 digest:\s*([a-f\d]{64})/gi)].map(match => match[1].toLowerCase()))];
if (certificates.length !== 1) throw Error('O APK deve ter uma única assinatura válida e compatível.');
const certificateSha256 = certificates[0];
const directory = path.resolve(option('--directory') || process.env.MOBILE_RELEASE_DIR || path.join(root, '.local/mobile-releases'));
fs.mkdirSync(directory, { recursive: true });
const latestPath = path.join(directory, 'latest.json');
const previous = fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, 'utf8')) : null;
const versionCode = Number(identity[2]);
const bytes = fs.readFileSync(source);
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (previous?.sha256 === sha256) { process.stdout.write('Esta versão já está publicada.\n'); process.exit(0); }
if (previous && versionCode <= previous.versionCode) throw Error('Aumente o versionCode antes de publicar um APK novo.');
if (previous && certificateSha256 !== previous.certificateSha256) throw Error('A assinatura deve ser a mesma da versão anterior para preservar a atualização.');
const filename = `inteliagent-${versionCode}-${sha256.slice(0,12)}.apk`;
const temporary = path.join(directory, randomUUID() + '.tmp');
fs.writeFileSync(temporary, bytes);
fs.renameSync(temporary, path.join(directory, filename));
const latest = {
  packageName: identity[1], version: identity[3], versionCode,
  downloadUrl: '/mobile/releases/' + filename,
  sha256, size: bytes.length, certificateSha256,
  notes: option('--notes') || '', publishedAt: new Date().toISOString(),
};
const manifestTemporary = path.join(directory, randomUUID() + '.json.tmp');
fs.writeFileSync(manifestTemporary, JSON.stringify(latest, null, 2) + '\n');
fs.renameSync(manifestTemporary, latestPath);
process.stdout.write(`Publicado Inteliagent ${latest.version} (${versionCode}): /mobile/releases/latest.apk\n`);
