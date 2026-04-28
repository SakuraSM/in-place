#!/usr/bin/env node
/**
 * 将仓库内所有 package.json、apps/mobile/app.json 与 Android native versionName 统一为指定值。
 *
 * 用法：node scripts/bump-version.mjs <version>
 *   <version>  目标版本号，例如 1.2.3（不带 v 前缀）
 *
 * 该脚本被 .github/workflows/release.yml 在发布时调用，
 * 也可以本地执行用于本地预览或手动同步。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 接受标准 SemVer：MAJOR.MINOR.PATCH，可选 -prerelease 和 +build 段
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const targets = [
  'package.json',
  'apps/web/package.json',
  'apps/server/package.json',
  'apps/mobile/package.json',
  'apps/mobile/app.json',
  'packages/app-core/package.json',
  'packages/api-client/package.json',
  'packages/db/package.json',
  'packages/domain/package.json',
];

const textTargets = [
  {
    rel: 'apps/mobile/android/app/build.gradle',
    update(content, version) {
      return content.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
    },
  },
];

async function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node scripts/bump-version.mjs <version>');
    process.exit(1);
  }
  if (!SEMVER_RE.test(version)) {
    console.error(`Invalid version: ${version}`);
    process.exit(1);
  }

  let updated = 0;
  for (const rel of targets) {
    const file = path.join(repoRoot, rel);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        console.warn(`Skip missing ${rel}`);
        continue;
      }
      throw error;
    }

    const json = JSON.parse(raw);
    if (rel === 'apps/mobile/app.json') {
      if (!json.expo) {
        console.warn(`Skip ${rel}: missing "expo" key`);
        continue;
      }
      if (json.expo.version === version) {
        continue;
      }
      json.expo.version = version;
    } else {
      if (json.version === version) {
        continue;
      }
      json.version = version;
    }

    // 保留尾随换行符以满足通用格式约定
    const trailingNewline = raw.endsWith('\n') ? '\n' : '';
    await writeFile(file, `${JSON.stringify(json, null, 2)}${trailingNewline}`);
    console.log(`Updated ${rel} -> ${version}`);
    updated += 1;
  }

  for (const target of textTargets) {
    const file = path.join(repoRoot, target.rel);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        console.warn(`Skip missing ${target.rel}`);
        continue;
      }
      throw error;
    }

    const next = target.update(raw, version);
    if (next === raw) {
      continue;
    }

    await writeFile(file, next);
    console.log(`Updated ${target.rel} -> ${version}`);
    updated += 1;
  }

  console.log(`Done. ${updated} file(s) updated.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
