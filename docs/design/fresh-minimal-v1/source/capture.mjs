// Run through ego-browser, which supplies taskSpace(). No Playwright dependency.
import {PAGES} from './catalog.js';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const SPACE_ID=18;
const ORIGIN='http://127.0.0.1:4173';
const task=await taskSpace(SPACE_ID);
const page=task.page('p1');
const records=[];
for(const platform of ['web','mobile']){
  const width=platform==='web'?1440:390;
  const height=platform==='web'?1024:844;
  await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  for(const board of PAGES.filter(entry=>entry[platform])){
    await page.goto(`${ORIGIN}/preview.html?page=${board.id}&platform=${platform}`);
    await page.waitForFunction(()=>window.designReady&&[...document.images].every(image=>image.complete),undefined,{timeout:10000});
    const check=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth,
      documentHeight:document.documentElement.scrollHeight,
      brokenImages:[...document.images].filter(image=>!image.naturalWidth).map(image=>image.getAttribute('src')),
      heading:document.querySelector('h1,h2')?.textContent,
    }));
    if(check.brokenImages.length||check.scrollWidth>width) throw new Error(JSON.stringify({page:board.id,platform,...check}));
    await page.evaluate(()=>{document.body.dataset.export='full';});
    await page.screenshot({path:`${ROOT}screens/${platform}/${board.id}.png`,fullPage:true});
    records.push({page:board.id,platform,width,minHeight:height,...check});
    console.log(`${platform}/${board.id}: OK`);
  }
}
writeFileSync(`${ROOT}validation.json`,JSON.stringify({date:'2026-10-27',kind:'Static artboard browser rendering; not application or physical-device acceptance',records},null,2)+'\n');
console.log({exported:records.length});
