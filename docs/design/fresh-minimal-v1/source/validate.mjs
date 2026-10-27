import {readFileSync,writeFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {PAGES} from './catalog.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const REPO=fileURLToPath(new URL('../../../../',import.meta.url));
const failures=[];
const css=readFileSync(`${ROOT}source/tokens.css`,'utf8');
const tokens=Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):([^;]+);/g)].map(([,name,value])=>[name,value.trim()]));
writeFileSync(`${ROOT}tokens.json`,JSON.stringify({version:1,date:'2026-10-27',status:'proposed; not applied to runtime packages/ui',source:'source/tokens.css',tokens},null,2)+'\n');

const links=(page,platform)=>page[platform]?`[${page[platform]}](screens/${platform}/${page.id}.png)`:'不适用';
const coverage=['# 页面覆盖清单','','以 `apps/web/src/app/App.tsx`、`apps/mobile/app` 和共享导航为当前入口依据。以下为设计覆盖，不表示功能已实现或验收。','','| 设计板 | 模板 | Web 入口与 PNG | 移动入口与 PNG |','| --- | --- | --- | --- |',...PAGES.map(page=>`| ${page.title} | ${page.template} | ${links(page,'web')} | ${links(page,'mobile')} |`),'','## 复用与重定向','','- Web `/search` 重定向到 `/overview`；`/notes` 重定向到 `/tags`；未知地址按现有逻辑返回首页。','- 移动根入口、认证布局和 tabs 布局不独立出稿；它们的导航壳由各页面共用。','- 原生管理中心使用现有 `/(tabs)/categories`；分类编辑使用 `/manage/categories`，两者语义不同。','- Web 新增 / 编辑沿用现有浮层，稿件将表单内容展开以方便评审。','- 原生地图桥接画布是内部 WebView 页面，地图详情与筛选复用地图稿。','- `PlatformStatusPage` 通过平台模式渲染，未加入主业务路由。','- 33 个页面或状态设计板加 2 个设计系统板，共 35 项；按端适用性导出 32 张 Web 与 34 张移动 PNG。',''];
writeFileSync(`${ROOT}coverage.md`,coverage.join('\n'));

for(const file of readdirSync(`${ROOT}source`).filter(name=>/\.(js|mjs)$/.test(name))) {
  try{execFileSync(process.execPath,['--check',`${ROOT}source/${file}`],{stdio:'pipe'});}catch{failures.push(`Syntax: ${file}`);}
}
for(const page of PAGES){for(const platform of ['web','mobile']){
  if(!page[platform])continue;
  const path=`${ROOT}screens/${platform}/${page.id}.png`;
  if(!existsSync(path)){failures.push(`PNG missing: ${platform}/${page.id}`);continue;}
  const image=readFileSync(path);
  const expectedWidth=platform==='web'?1440:390;
  const expectedHeight=platform==='web'?1024:844;
  if(image.readUInt32BE(16)!==expectedWidth||image.readUInt32BE(20)<expectedHeight)failures.push(`PNG dimensions: ${platform}/${page.id}`);
}}
const app=readFileSync(`${REPO}apps/web/src/app/App.tsx`,'utf8');
const routes=[...app.matchAll(/<Route path="([^"]+)"/g)].map(match=>match[1]);
const redirects=['/search','/notes','*'];
for(const route of routes.filter(value=>!redirects.includes(value))){
  if(!PAGES.some(page=>page.web?.split('；')[0]===route||page.web?.startsWith(route+'?')||route==='/'&&page.id==='home'))failures.push(`Web route missing: ${route}`);
}
function nativeRoutes(folder,prefix=''){
  return readdirSync(folder).flatMap(name=>{
    const route=`${prefix}/${name}`;
    if(statSync(join(folder,name)).isDirectory())return nativeRoutes(join(folder,name),route);
    return name.endsWith('.tsx')&&name!=='_layout.tsx'&&route!=='/index.tsx'?route.replace(/\.tsx$/,''):[];
  });
}
const mobileRoutes=nativeRoutes(`${REPO}apps/mobile/app`);
const mobileAliases={'/(tabs)/index':'home','/operations/stocktakes/index':'stocktakes'};
for(const route of mobileRoutes){
  if(!mobileAliases[route]&&!PAGES.some(page=>page.mobile?.split(' → ')[0]===route))failures.push(`Mobile route missing: ${route}`);
}
function luminance(hex){
  const values=hex.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
const contrastPairs=[['text','canvas'],['muted','canvas'],['muted','surface'],['surface','brand'],['brand','tint'],['warning','warning-tint'],['danger','danger-tint'],['info','info-tint']];
const contrasts=contrastPairs.map(([foreground,background])=>{
  const first=luminance(tokens[foreground].length===4?'#'+tokens[foreground].slice(1).split('').map(value=>value+value).join(''):tokens[foreground]);
  const second=luminance(tokens[background].length===4?'#'+tokens[background].slice(1).split('').map(value=>value+value).join(''):tokens[background]);
  const ratio=(Math.max(first,second)+.05)/(Math.min(first,second)+.05);
  if(ratio<4.5)failures.push(`Contrast below 4.5: ${foreground}/${background} ${ratio}`);
  return {foreground,background,ratio:Number(ratio.toFixed(2))};
});
function countFiles(folder){return readdirSync(folder).reduce((count,name)=>count+(statSync(join(folder,name)).isDirectory()?countFiles(join(folder,name)):1),0);}
const result={date:'2026-10-27',boards:PAGES.length,pngs:66,webRoutes:routes.length,coveredNonRedirectWebRoutes:routes.length-redirects.length,coveredMobilePageFiles:mobileRoutes.length,files:countFiles(ROOT),contrasts,failures};
writeFileSync(`${ROOT}source-checks.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
