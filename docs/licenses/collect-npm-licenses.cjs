/*
 * Regenerates npm dependency and license records from the committed lockfiles.
 * Usage: node docs/licenses/collect-npm-licenses.cjs <worktree-root> <installed-root> [npm-cache-root]
 */
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CLIENTS = ['frontend', 'desktop', 'mobile'];
const inputArgs = process.argv.slice(2).filter((argument) => argument !== '--offline');
const worktreeRoot = path.resolve(inputArgs[0] || path.resolve(__dirname, '..', '..'));
const installedRoot = path.resolve(inputArgs[1] || worktreeRoot);
const defaultCache = process.env.npm_config_cache
  || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'npm-cache'))
  || (process.env.HOME && path.join(process.env.HOME, '.npm'));
const cacheRoot = path.resolve(inputArgs[2] || defaultCache || worktreeRoot);
const allowNetwork = !process.argv.includes('--offline');
const outputDir = __dirname;
const noticeDir = path.join(outputDir, 'npm');
const jsonFile = path.join(outputDir, 'npm-dependencies.json');
const markdownFile = path.join(outputDir, 'NPM_DEPENDENCIES.md');
const noticeCache = new Map();
const CURATED_VERSION_LICENSES = {
  '@react-native-community/slider@5.2.0': {
    url: 'https://raw.githubusercontent.com/callstack/react-native-slider/a74635e56054000208979fbe68dd931b340f3ea6/LICENSE.md',
    sha256: '7d060af61ae5e95c26d620ce2d40fec91ff3175824e516905e8a61b4d94b07af',
  },
  'expo-router@57.0.19': {
    url: 'https://raw.githubusercontent.com/expo/expo/d36f125067e9c6e67689f2b75cf4fb19254c3c59/LICENSE',
    sha256: 'fb3ca4a837f5779e83cef89b78253a8949cfb9429c340309f62d0465ec6610b4',
  },
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateLockfiles() {
  for (const client of CLIENTS) {
    const lock = readJson(path.join(worktreeRoot, client, 'package-lock.json'));
    if (!lock.packages || !lock.packages[''] || !Number.isInteger(lock.lockfileVersion)) {
      throw new Error('Invalid npm lockfile: ' + client + '/package-lock.json');
    }
  }
}

function packageName(lockPath, manifest) {
  if (manifest && manifest.name) return manifest.name;
  const parts = lockPath.split('/');
  const marker = parts.lastIndexOf('node_modules');
  if (marker < 0) return null;
  return parts[marker + 1] && parts[marker + 1].startsWith('@')
    ? parts[marker + 1] + '/' + parts[marker + 2]
    : parts[marker + 1] || null;
}

function parentPackage(lockPath) {
  const parts = lockPath.split('/');
  const marker = parts.lastIndexOf('node_modules');
  return marker > 0 ? parts.slice(0, marker).join('/') : null;
}

function resolveDependency(packagePaths, fromPath, dependencyName) {
  let cursor = fromPath;
  while (cursor) {
    const nested = cursor + '/node_modules/' + dependencyName;
    if (packagePaths.has(nested)) return nested;
    cursor = parentPackage(cursor);
  }
  const hoisted = 'node_modules/' + dependencyName;
  return packagePaths.has(hoisted) ? hoisted : null;
}

function reachable(lock, packagePaths, direct) {
  const found = new Set();
  const queue = Object.keys(direct || {})
    .map((name) => resolveDependency(packagePaths, '', name))
    .filter(Boolean);
  while (queue.length) {
    const current = queue.shift();
    if (found.has(current)) continue;
    found.add(current);
    const entry = lock.packages[current] || {};
    const children = Object.assign({}, entry.dependencies || {}, entry.optionalDependencies || {});
    for (const name of Object.keys(children)) {
      const next = resolveDependency(packagePaths, current, name);
      if (next && !found.has(next)) queue.push(next);
    }
  }
  return found;
}

function repositoryUrl(repository) {
  if (!repository) return null;
  let value = typeof repository === 'string' ? repository : repository.url;
  if (!value) return null;
  value = value.replace(/^git\+/, '').replace(/^git:\/\//, 'https://');
  value = value.replace(/^ssh:\/\/(?:git@)?github\.com\//, 'https://github.com/');
  value = value.replace(/^git@github\.com:/, 'https://github.com/');
  if (value.startsWith('github:')) value = 'https://github.com/' + value.slice(7);
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && /^[^/\s]+\/[^/\s]+(?:#.*)?$/.test(value)) {
    value = 'https://github.com/' + value;
  }
  return value.replace(/\.git(?=#|$)/, '');
}

function registryUrl(name, version) {
  return 'https://registry.npmjs.org/' + encodeURIComponent(name || 'unknown') + '/' + encodeURIComponent(version || 'latest');
}

function licenseDeclaration(manifest, lockEntry) {
  const value = (manifest && manifest.license) || lockEntry.license || null;
  return typeof value === 'string' ? value : value ? JSON.stringify(value) : null;
}

function licenseFileName(name) {
  return /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(name);
}

function copyNotice(source, sourceName) {
  return copyNoticeBytes(fs.readFileSync(source), sourceName);
}

function copyNoticeBytes(bytes, sourceName) {
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (!noticeCache.has(sha256)) {
    const destination = sha256 + '.txt';
    fs.writeFileSync(path.join(noticeDir, destination), bytes);
    noticeCache.set(sha256, destination);
  }
  return { file: 'npm/' + noticeCache.get(sha256), sourceFile: sourceName, sha256 };
}

function cacheTarballPath(integrity) {
  const token = String(integrity || '').split(/\s+/).find((item) => item.startsWith('sha512-'));
  if (!cacheRoot || !token) return null;
  const hex = Buffer.from(token.slice(7), 'base64').toString('hex');
  const candidate = path.join(cacheRoot, '_cacache', 'content-v2', 'sha512', hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
  return fs.existsSync(candidate) ? candidate : null;
}

function tarFilesFromBytes(bytes) {
  const tar = require('node:zlib').gunzipSync(bytes);
  const files = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim(), 8) || 0;
    const fullName = (prefix ? prefix + '/' : '') + name;
    const dataStart = offset + 512;
    if (/(?:^|\/)(?:package\.json|(?:licen[cs]e|copying|notice)(?:[._-].*)?|readme(?:[._-].*)?)$/i.test(fullName) && size <= 262144) {
      files.set(fullName, tar.subarray(dataStart, dataStart + size));
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  const packageJson = [...files.entries()].find(([file]) => /(?:^|\/)package\.json$/i.test(file));
  if (!packageJson) return null;
  try {
    return { manifest: JSON.parse(packageJson[1].toString('utf8')), files };
  } catch {
    return null;
  }
}

function tarFilesFromCache(integrity) {
  const cacheFile = cacheTarballPath(integrity);
  return cacheFile ? tarFilesFromBytes(fs.readFileSync(cacheFile)) : null;
}

function integrityMatches(bytes, integrity) {
  const token = String(integrity || '').split(/\s+/).find((item) => item.startsWith('sha512-'));
  if (!token) return false;
  return crypto.createHash('sha512').update(bytes).digest('base64') === token.slice(7);
}

function tarFilesFromRegistry(url, integrity) {
  if (!allowNetwork || !url || !/^https:\/\/registry\.npmjs\.org\//.test(url)) return null;
  const result = childProcess.spawnSync('curl.exe', [
    '-L', '--fail', '--max-time', '30', '--max-filesize', '1048576', '--silent', '--show-error', url,
  ], { encoding: null, maxBuffer: 1153434 });
  if (result.status !== 0 || !result.stdout || !integrityMatches(result.stdout, integrity)) return null;
  try {
    return tarFilesFromBytes(result.stdout);
  } catch {
    return null;
  }
}

function curatedLicenseText(name, version) {
  const source = CURATED_VERSION_LICENSES[name + '@' + version];
  if (!source) return null;
  const existingFile = path.join(resolvedNoticeDir, source.sha256 + '.txt');
  if (fs.existsSync(existingFile)) {
    const existing = fs.readFileSync(existingFile);
    if (crypto.createHash('sha256').update(existing).digest('hex') === source.sha256) {
      return {
        file: 'npm/' + source.sha256 + '.txt',
        sourceFile: source.url,
        sha256: source.sha256,
        sourceUrl: source.url,
      };
    }
  }
  if (!allowNetwork) return null;
  const result = childProcess.spawnSync('curl.exe', [
    '-L', '--fail', '--max-time', '30', '--max-filesize', '262144', '--silent', '--show-error', source.url,
  ], { encoding: null, maxBuffer: 288358 });
  if (result.status !== 0 || !result.stdout) return null;
  const sha256 = crypto.createHash('sha256').update(result.stdout).digest('hex');
  if (sha256 !== source.sha256) return null;
  return Object.assign(copyNoticeBytes(result.stdout, source.url), { sourceUrl: source.url });
}

function licenseStatus(declaration, texts, metadataOrigin, exactInstalledVersion, lockEntry) {
  if (metadataOrigin === 'installed-version-mismatch') return 'unverified-installed-version-mismatch';
  const special = !declaration || /see\s+licen[cs]e\s+in|^unlicensed$|^unknown$|licenseref/i.test(declaration);
  if (texts.length) return special ? 'text-extracted-needs-review' : 'text-extracted';
  if (metadataOrigin === 'lockfile') {
    if (lockEntry.os || lockEntry.cpu) return 'platform-selectable-metadata-unavailable';
    if (lockEntry.optional) return 'optional-package-metadata-unavailable';
    return 'unverified-package-metadata-unavailable';
  }
  if (special) return 'unverified-declaration-or-text-missing';
  return 'license-text-not-packaged';
}

function collectClient(client) {
  const lock = readJson(path.join(worktreeRoot, client, 'package-lock.json'));
  const root = lock.packages[''] || {};
  const packagePaths = new Set(Object.keys(lock.packages).filter((key) => key.includes('node_modules/')));
  const runtime = reachable(lock, packagePaths, root.dependencies);
  const development = reachable(lock, packagePaths, root.devDependencies);
  const directRuntimePaths = new Set(Object.keys(root.dependencies || {})
    .map((name) => resolveDependency(packagePaths, '', name))
    .filter(Boolean));
  const directDevelopmentPaths = new Set(Object.keys(root.devDependencies || {})
    .map((name) => resolveDependency(packagePaths, '', name))
    .filter(Boolean));
  const records = [];

  for (const lockPath of [...packagePaths].sort()) {
    const lockEntry = lock.packages[lockPath] || {};
    const manifestPath = path.join(installedRoot, client, ...lockPath.split('/'), 'package.json');
    let manifest = null;
    try { manifest = readJson(manifestPath); } catch { /* Lockfile still supplies version and integrity. */ }
    const version = lockEntry.version || (manifest && manifest.version) || null;
    const exactInstalledVersion = Boolean(manifest && (!lockEntry.version || manifest.version === lockEntry.version));
    const cached = exactInstalledVersion ? null : tarFilesFromCache(lockEntry.integrity);
    const cachedVersionMatchesLockfile = Boolean(cached && (!lockEntry.version || cached.manifest.version === lockEntry.version));
    const directPackage = directRuntimePaths.has(lockPath) || directDevelopmentPaths.has(lockPath);
    const runtimeWithoutPlatformSelection = runtime.has(lockPath) && !lockEntry.optional && !lockEntry.os && !lockEntry.cpu;
    const registry = !exactInstalledVersion && !cachedVersionMatchesLockfile && (directPackage || runtimeWithoutPlatformSelection)
      ? tarFilesFromRegistry(lockEntry.resolved, lockEntry.integrity)
      : null;
    const registryVersionMatchesLockfile = Boolean(registry && (!lockEntry.version || registry.manifest.version === lockEntry.version));
    const metadataOrigin = exactInstalledVersion
      ? 'installed-node_modules'
      : cachedVersionMatchesLockfile
        ? 'npm-cache-tarball'
        : registryVersionMatchesLockfile
          ? 'npm-registry-tarball'
        : manifest
          ? 'installed-version-mismatch'
          : 'lockfile';
    const verifiedManifest = exactInstalledVersion
      ? manifest
      : cachedVersionMatchesLockfile
        ? cached.manifest
        : registryVersionMatchesLockfile
          ? registry.manifest
        : null;
    const texts = [];
    if (verifiedManifest) {
      if (metadataOrigin === 'installed-node_modules') {
        const packageDir = path.dirname(manifestPath);
        for (const name of fs.readdirSync(packageDir).sort()) {
          const candidate = path.join(packageDir, name);
          if (licenseFileName(name) && fs.statSync(candidate).isFile()) texts.push(copyNotice(candidate, name));
        }
      } else {
        const tarball = cachedVersionMatchesLockfile ? cached : registry;
        for (const [file, bytes] of tarball.files) {
          if (licenseFileName(path.basename(file))) texts.push(copyNoticeBytes(bytes, file));
        }
        if (/see\s+licen[cs]e\s+in\s+readme/i.test(String(verifiedManifest.license || ''))) {
          for (const [file, bytes] of tarball.files) {
            if (/(?:^|\/)readme(?:[._-].*)?$/i.test(file)) texts.push(copyNoticeBytes(bytes, file));
          }
        }
      }
    }
    const name = packageName(lockPath, manifest);
    const curatedText = curatedLicenseText(name, version);
    if (curatedText) texts.push(curatedText);
    if (name === 'pretendard' && version === '1.3.9') {
      const fontNotice = path.join(outputDir, 'fonts', 'Pretendard-OFL.txt');
      if (fs.existsSync(fontNotice)) {
        texts.push({
          file: 'fonts/Pretendard-OFL.txt',
          sourceFile: 'official Pretendard v1.3.9 LICENSE',
          sha256: crypto.createHash('sha256').update(fs.readFileSync(fontNotice)).digest('hex'),
        });
      }
    }
    const declaration = licenseDeclaration(verifiedManifest, lockEntry);
    const runtimeUsed = runtime.has(lockPath);
    const developmentUsed = development.has(lockPath);
    records.push({
      client,
      lockfilePath: lockPath,
      name,
      version,
      direct: directPackage,
      directKind: directRuntimePaths.has(lockPath) ? 'runtime' : directDevelopmentPaths.has(lockPath) ? 'development' : null,
      usage: runtimeUsed && developmentUsed ? 'runtime-and-development' : runtimeUsed ? 'runtime' : developmentUsed ? 'development' : 'unclassified',
      license: {
        declaration,
        status: licenseStatus(declaration, texts, metadataOrigin, Boolean(verifiedManifest), lockEntry),
        originalTexts: texts,
      },
      source: {
        repository: repositoryUrl(verifiedManifest && verifiedManifest.repository),
        homepage: (verifiedManifest && verifiedManifest.homepage) || null,
        registry: registryUrl(name, version),
      },
      resolved: lockEntry.resolved || null,
      integrity: lockEntry.integrity || null,
      installedPackageMetadata: Boolean(manifest),
      installedPackageVersion: (manifest && manifest.version) || null,
      installedMetadataMatchesLockfile: exactInstalledVersion,
      packageMetadataOrigin: metadataOrigin,
      platform: {
        optional: Boolean(lockEntry.optional),
        os: lockEntry.os || null,
        cpu: lockEntry.cpu || null,
      },
    });
  }
  return {
    lockfile: client + '/package-lock.json',
    lockfileVersion: lock.lockfileVersion,
    directRuntime: Object.keys(root.dependencies || {}).sort(),
    directDevelopment: Object.keys(root.devDependencies || {}).sort(),
    records,
  };
}

function md(value) {
  return String(value || '—').replace(/\|/g, '\\|');
}

function markdownLink(label, url) {
  return url ? '[' + label + '](' + url + ')' : '—';
}

const resolvedOutputDir = path.resolve(outputDir);
const resolvedNoticeDir = path.resolve(noticeDir);
validateLockfiles();
if (resolvedNoticeDir !== path.join(resolvedOutputDir, 'npm') || path.dirname(resolvedNoticeDir) !== resolvedOutputDir) {
  throw new Error('Refusing to clean a path outside docs/licenses/npm');
}
if (fs.existsSync(resolvedNoticeDir)) {
  const unexpected = fs.readdirSync(resolvedNoticeDir).filter((name) => !/^[a-f0-9]{64}\.txt$/i.test(name));
  if (unexpected.length) throw new Error('Refusing to clean non-generated files from docs/licenses/npm: ' + unexpected.join(', '));
}
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(noticeDir, { recursive: true });
const clients = Object.fromEntries(CLIENTS.map((client) => [client, collectClient(client)]));
const records = CLIENTS.flatMap((client) => clients[client].records);
const counts = {
  totalLockEntries: records.length,
  directRuntime: records.filter((entry) => entry.directKind === 'runtime').length,
  directDevelopment: records.filter((entry) => entry.directKind === 'development').length,
  runtimeReachable: records.filter((entry) => entry.usage.includes('runtime')).length,
  developmentOnly: records.filter((entry) => entry.usage === 'development').length,
  unclassified: records.filter((entry) => entry.usage === 'unclassified').length,
  licenseTextExtracted: records.filter((entry) => entry.license.status.startsWith('text-extracted')).length,
  platformSelectable: records.filter((entry) => entry.license.status === 'platform-selectable-metadata-unavailable').length,
  optionalNotInstalled: records.filter((entry) => entry.license.status === 'optional-package-metadata-unavailable').length,
  licenseTextNotPackaged: records.filter((entry) => entry.license.status === 'license-text-not-packaged').length,
  actualUnverified: records.filter((entry) => entry.license.status.startsWith('unverified-') || entry.license.status === 'text-extracted-needs-review').length,
  noExactPackageMetadata: records.filter((entry) => entry.packageMetadataOrigin === 'lockfile').length,
  installedNodeModulesUnavailable: records.filter((entry) => !entry.installedPackageMetadata).length,
  metadataVersionMismatches: records.filter((entry) => entry.installedPackageMetadata && !entry.installedMetadataMatchesLockfile).length,
  uniqueNoticeFiles: new Set(records.flatMap((entry) => entry.license.originalTexts.map((text) => text.file))).size,
};
const output = {
  generatedAt: new Date().toISOString(),
  generator: 'docs/licenses/collect-npm-licenses.cjs',
  input: {
    lockfiles: CLIENTS.map((client) => client + '/package-lock.json'),
    installedMetadataRoot: '<provided-at-generation-time>',
  },
  statusDefinitions: {
    'text-extracted': '설치된 패키지 최상위 LICENSE/LICENCE/COPYING/NOTICE 원문을 추출했다.',
    'text-extracted-needs-review': '원문은 추출했지만 선언이 비표준 또는 특수 표현이다.',
    'license-text-not-packaged': 'lockfile과 같은 버전의 package.json 선언은 확인했지만 npm 배포물에 원문 파일이 없었다.',
    'platform-selectable-metadata-unavailable': '현재 플랫폼에 설치되지 않은 OS/CPU 선택 패키지다.',
    'optional-package-metadata-unavailable': '현재 설치에 없는 선택 의존성이다.',
    'unverified-declaration-or-text-missing': '선언이 없거나 SEE LICENSE IN/UNLICENSED/UNKNOWN/LicenseRef 계열이며 원문도 찾지 못했다.',
    'unverified-package-metadata-unavailable': '설치된 package.json을 찾지 못해 원문을 확인하지 못했다.',
    'unverified-installed-version-mismatch': '설치된 package.json 버전이 lockfile과 달라 라이선스 원문으로 사용하지 않았다.',
  },
  counts,
  clients,
};
fs.writeFileSync(jsonFile, JSON.stringify(output, null, 2) + '\n');

const directRows = CLIENTS.flatMap((client) => clients[client].records
  .filter((entry) => entry.direct)
  .sort((left, right) => left.name.localeCompare(right.name))
  .map((entry) => '| ' + client + ' | <code>' + md(entry.name) + '</code> | ' + md(entry.version) + ' | ' + (entry.directKind === 'runtime' ? '런타임' : '개발') + ' | ' + md(entry.license.declaration) + ' | <code>' + md(entry.license.status) + '</code> | ' + (entry.license.originalTexts.map((text) => markdownLink('원문', './' + text.file)).join(', ') || '—') + ' | ' + markdownLink('저장소', entry.source.repository || entry.source.homepage) + ' / ' + markdownLink('registry', entry.source.registry) + ' |'));
function issueRows(statuses) {
  return records
    .filter((entry) => statuses.includes(entry.license.status))
    .sort((left, right) => (left.client + '/' + left.name).localeCompare(right.client + '/' + right.name))
    .map((entry) => '- <code>' + entry.client + ':' + entry.lockfilePath + '</code> — ' + md(entry.name) + '@' + md(entry.version) + ': <code>' + md(entry.license.status) + '</code> (' + md(entry.license.declaration) + ')');
}
const issueSections = [
  ['플랫폼 선택형으로 현재 설치되지 않은 패키지', ['platform-selectable-metadata-unavailable']],
  ['선택 의존성으로 현재 설치되지 않은 패키지', ['optional-package-metadata-unavailable']],
  ['원문이 npm 배포물에 동봉되지 않은 패키지', ['license-text-not-packaged']],
  ['실제 수동 확인이 필요한 패키지', ['unverified-package-metadata-unavailable', 'unverified-declaration-or-text-missing', 'unverified-installed-version-mismatch', 'text-extracted-needs-review']],
].flatMap(([title, statuses]) => {
  const rows = issueRows(statuses);
  return rows.length ? ['### ' + title, '', ...rows, ''] : [];
});
const markdown = [
  '# npm 의존성 및 라이선스 인벤토리',
  '',
  '생성일: ' + output.generatedAt,
  '',
  '이 문서는 frontend/, desktop/, mobile/의 커밋된 package-lock.json을 기준으로 한 npm 의존성 인벤토리입니다. 버전·무결성·배포 위치는 lockfile을 기준으로 하고, 라이선스 선언·저장소 주소·원문 고지는 설치된 node_modules의 package.json과 최상위 LICENSE/LICENCE/COPYING/NOTICE 파일을 대조했습니다.',
  '',
  '상세 목록은 [npm-dependencies.json](./npm-dependencies.json)에 있습니다. JSON에는 직접·간접 의존성 각각의 lockfile 경로, 확정 버전, 런타임/개발 도달 범위, 선언 라이선스, 공식 저장소 또는 홈페이지, npm registry 메타데이터 URL, 원문 고지 파일 연결을 기록합니다.',
  '',
  '## 재생성',
  '',
  '같은 checkout에서 재생성할 때는 저장소 루트에서 실행합니다. 현재 설치되지 않은 직접 의존성과 플랫폼 조건이 없는 런타임 의존성은 npm 공식 registry의 해당 버전 tarball을 최대 1 MiB까지만 읽어 LICENSE/NOTICE를 보완합니다.',
  '',
  '~~~powershell',
  'node docs/licenses/collect-npm-licenses.cjs . .',
  '~~~',
  '',
  '별도 checkout의 lockfile과 설치 메타데이터를 사용할 때는 상대 경로를 지정합니다.',
  '',
  '~~~powershell',
  'node docs/licenses/collect-npm-licenses.cjs ..\\lockfile-checkout ..\\installed-checkout',
  '~~~',
  '',
  '네트워크를 쓰지 않는 수집은 마지막 인수로 --offline을 넣습니다. 스크립트는 docs/licenses/npm/의 SHA-256 이름 생성물만 정리하며, 대상 경로와 기존 파일명을 검증한 뒤에만 정리합니다. 앱 패키지나 lockfile은 수정하지 않습니다.',
  '',
  '## 수집 결과',
  '',
  '- lockfile 의존성 항목: ' + counts.totalLockEntries + '개',
  '- 직접 런타임 / 개발 의존성: ' + counts.directRuntime + '개 / ' + counts.directDevelopment + '개',
  '- 런타임 도달 / 개발 전용 / 분류 불가: ' + counts.runtimeReachable + '개 / ' + counts.developmentOnly + '개 / ' + counts.unclassified + '개',
  '- 원문 고지 추출 항목 / 고유 파일: ' + counts.licenseTextExtracted + '개 / ' + counts.uniqueNoticeFiles + '개',
  '- 플랫폼 선택형 / 선택 의존성 미설치: ' + counts.platformSelectable + '개 / ' + counts.optionalNotInstalled + '개',
  '- 원문 미동봉 / 실제 수동 확인 필요: ' + counts.licenseTextNotPackaged + '개 / ' + counts.actualUnverified + '개',
  '- 정확한 패키지 메타데이터 미발견 / lockfile 버전 불일치: ' + counts.noExactPackageMetadata + '개 / ' + counts.metadataVersionMismatches + '개',
  '',
  '## 클라이언트 핵심 직접 의존성',
  '',
  '| 클라이언트 | 패키지 | 확정 버전 | 용도 | 선언 라이선스 | 확인 상태 | 원문 고지 | 공식 소스 |',
  '| --- | --- | ---: | --- | --- | --- | --- | --- |',
  ...directRows,
  '',
  '## 라이선스 원문과 미확인 항목',
  '',
  '추출 가능한 원문 고지는 각 상세 항목의 license.originalTexts[].file에서 npm/<SHA-256>.txt로 연결됩니다. text-extracted는 원문 파일을 확보했다는 뜻이며, 법적 호환성이나 재배포 의무가 자동으로 판정되었다는 뜻은 아닙니다.',
  '',
  '플랫폼 선택형과 선택 의존성 미설치는 현재 머신에 없는 패키지라는 설치 상태이며, 실제 라이선스 미확인과 구분합니다. 원문 미동봉은 같은 버전의 선언을 확인했지만 npm 배포물에서 LICENSE/NOTICE를 찾지 못한 경우입니다. 실제 수동 확인 항목만 앱 자체 라이선스 결정 전에 검토합니다.',
  '',
  ...(issueSections.length ? issueSections : ['- 없음']),
  '',
  '## 범위와 한계',
  '',
  '- 이 목록은 npm lockfile 항목만 다룹니다. Android Gradle, Electron 런타임 번들, 운영체제 구성요소, 이미지·폰트·기타 에셋은 포함하지 않습니다.',
  '- 런타임/개발 분류는 lockfile의 직접 의존성과 dependencies·optionalDependencies 그래프를 따라 계산했습니다. peer dependency, 조건부 로딩 또는 외부 번들링 경로는 별도로 검토해야 합니다.',
  '- 설치된 패키지 메타데이터 또는 원문을 찾지 못했거나, 설치 버전이 lockfile과 다른 항목은 JSON과 이 문서에서 숨기지 않고 미확인 상태로 남겼습니다.',
];
fs.writeFileSync(markdownFile, markdown.join('\n') + '\n');
const referencedNoticeFiles = new Set(records.flatMap((entry) => entry.license.originalTexts
  .map((text) => text.file)
  .filter((file) => file.startsWith('npm/'))
  .map((file) => path.basename(file))));
for (const name of fs.readdirSync(resolvedNoticeDir)) {
  if (!referencedNoticeFiles.has(name)) fs.unlinkSync(path.join(resolvedNoticeDir, name));
}
console.log(JSON.stringify({ output: 'docs/licenses', counts }, null, 2));
