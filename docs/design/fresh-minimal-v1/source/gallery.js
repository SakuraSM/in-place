import {PAGES} from './catalog.js';
const GROUPS=['全部',...new Set(PAGES.map(page=>page.group))];
let activeGroup='全部';
const groups=document.getElementById('groups');
groups.innerHTML=GROUPS.map((group,index)=>`<button type="button" data-group="${group}" class="${index===0?'active':''}" aria-pressed="${index===0}">${group}</button>`).join('');
function renderCatalog() {
  const query=document.getElementById('filter').value.trim().toLowerCase();
  const pages=PAGES.filter(page=>(activeGroup==='全部'||page.group===activeGroup)&&`${page.title} ${page.web} ${page.mobile}`.toLowerCase().includes(query));
  document.getElementById('catalog').innerHTML=pages.map((page,index)=>`<article><a class="thumbnail" href="preview.html?page=${page.id}&platform=${page.web?'web':'mobile'}"><img src="screens/${page.web?'web':'mobile'}/${page.id}.png" alt="${page.title}视觉稿缩略图" loading="lazy"><span>${page.group} / ${page.template}</span></a><div class="tile-copy"><small>${String(index+1).padStart(2,'0')} · ${page.group}</small><h3>${page.title}</h3><p>${page.description}</p><div class="tile-links">${page.web?`<a href="preview.html?page=${page.id}&platform=web">Web 稿 ↗</a>`:''}${page.mobile?`<a href="preview.html?page=${page.id}&platform=mobile">移动稿 ↗</a>`:''}<a href="screens/${page.web?'web':'mobile'}/${page.id}.png">PNG ↗</a></div></div></article>`).join('');
  document.getElementById('count').textContent=`当前显示 ${pages.length} 个页面 / 设计板。业务稿与原生端独有页面已按实际入口标注。`;
}
groups.addEventListener('click',event=>{
  const button=event.target.closest('[data-group]');if(!button)return;
  activeGroup=button.dataset.group;
  groups.querySelectorAll('button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});
  renderCatalog();
});
document.getElementById('filter').addEventListener('input',renderCatalog);
renderCatalog();
