import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const REPOSITORY = 'Rian6/inteliagent-app';
const parts = version => {
  if(typeof version!=='string'||version.length>32||!/^\d+\.\d+\.\d+$/.test(version)) return null;
  const values=version.split('.').map(Number);return values.every(Number.isSafeInteger)?values:null;
};
export function versionDecision(release, version, build) {
  const installed = parts(version), latest = parts(release?.version || '');
  if (!installed || !Number.isSafeInteger(build) || build < 1) throw Error('Invalid installed version');
  if (!latest || release.versionCode <= build) return 'none';
  for (let index = 0; index < 3; index++) {
    if (latest[index] < installed[index]) return 'none';
    if (latest[index] > installed[index]) return index < 2 ? 'mandatory' : 'persistent';
  }
  return 'normal';
}
function trustedAsset(value, repository) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password &&
    url.hostname === 'github.com' && url.pathname.startsWith('/' + repository + '/releases/download/'); } catch { return false; }
}
export function normalizeGitHubRelease(release, manifest, repository = REPOSITORY) {
  if (release.draft || release.prerelease || !parts(manifest?.version || '') ||
      !['v'+manifest.version, `v${manifest.version}+build.${manifest.versionCode}`].includes(release.tag_name) || manifest.packageName !== 'com.rian3054.inteliagentapp' ||
      !Number.isSafeInteger(manifest.versionCode) || manifest.versionCode < 1 ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256 || '') || !Number.isSafeInteger(manifest.size) || manifest.size < 1) return null;
  const name = `inteliagent-${manifest.versionCode}-${manifest.sha256.slice(0,12)}.apk`;
  const asset = release.assets?.find(item => item.name === name && item.state === 'uploaded');
  if (!asset || asset.size !== manifest.size || !trustedAsset(asset.browser_download_url, repository) ||
      (asset.digest && asset.digest !== 'sha256:' + manifest.sha256)) return null;
  return { packageName:manifest.packageName, version:manifest.version, versionCode:manifest.versionCode,
    sha256:manifest.sha256, size:manifest.size, notes:String(manifest.notes || '').slice(0,1000),
    downloadUrl:asset.browser_download_url, releaseUrl:release.html_url, source:'github', repository };
}
export class GitHubReleases {
  constructor({ repository=REPOSITORY, directory, fetcher=fetch, token=process.env.GITHUB_RELEASE_TOKEN || '' }={}) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw Error('Invalid GitHub repository');
    Object.assign(this,{repository,directory,fetcher,token});
    this.latest=null;this.checkedAt=0;this.stale=false;this.pending=null;this.assetCache=new Map();
  }
  async restore() {
    try { const cache=JSON.parse(await readFile(path.join(this.directory,'github-cache.json'),'utf8'));
      if (cache.repository===this.repository && trustedAsset(cache.latest?.downloadUrl,this.repository)) {
        this.latest=cache.latest;this.stale=true;
      }
    } catch { /* First start has no cached release. */ }
  }
  async refresh(force=false) {
    if (this.pending) return this.pending;
    if (!force && Date.now()-this.checkedAt<300000) {
      if (this.stale && !this.latest) throw Error('GitHub unavailable');
      return this.latest;
    }
    this.pending=this.load().finally(()=>{this.pending=null;});return this.pending;
  }
  async load() {
    this.checkedAt=Date.now();
    try {
      const response=await this.fetcher(`https://api.github.com/repos/${this.repository}/releases?per_page=100`,{
        headers:{Accept:'application/vnd.github+json','User-Agent':'Inteliagent-Version-Service',
          ...(this.token?{Authorization:'Bearer '+this.token}:{})}, signal:AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error('GitHub unavailable');
      const releases=await response.json();if (!Array.isArray(releases)) throw Error('Invalid releases');
      const valid=[];
      const rank=release=>/^v(\d+)\.(\d+)\.(\d+)(?:\+build\.(\d+))?$/.exec(release.tag_name||'')?.slice(1).map(value=>Number(value||0))||[0,0,0,0];
      releases.sort((a,b)=>{const x=rank(a),y=rank(b);for(let i=0;i<4;i++)if(x[i]!==y[i])return y[i]-x[i];return 0;});
      for (const release of releases) {
        if (release.draft || release.prerelease) continue;
        const asset=release.assets?.find(item=>item.name==='latest.json'&&item.state==='uploaded');
        if (!asset || asset.size>65536 || !trustedAsset(asset.browser_download_url,this.repository)) continue;
        let manifest=this.assetCache.get(asset.id);
        if (!manifest) {
          const data=await this.fetcher(asset.browser_download_url,{signal:AbortSignal.timeout(12000)});
          if (!data.ok) throw Error('Release metadata unavailable');
          manifest=await data.json();this.assetCache.set(asset.id,manifest);
        }
        const normalized=normalizeGitHubRelease(release,manifest,this.repository);if (normalized) { valid.push(normalized);break; }
      }
      valid.sort((a,b)=>b.versionCode-a.versionCode);
      this.latest=valid[0]||null;this.stale=false;this.lastSuccess=Date.now();
      if (this.directory) {
        await mkdir(this.directory,{recursive:true});
        const target=path.join(this.directory,'github-cache.json');
        await writeFile(target+'.tmp',JSON.stringify({repository:this.repository,latest:this.latest}));
        await rename(target+'.tmp',target);
      }
      return this.latest;
    } catch (error) { this.stale=true;if (!this.latest) throw error;return this.latest; }
  }
}
export function githubToken() {
  if (process.env.GITHUB_RELEASE_TOKEN) return process.env.GITHUB_RELEASE_TOKEN;
  try { return execFileSync('gh',['auth','token','--hostname','github.com'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim(); }
  catch { return ''; }
}
