import {PAGES,PRIMARY_NAV} from './catalog.js';
import {button,href,icon,search} from './primitives.js';
import {INVENTORY_VIEWS} from './inventory.js';
import {OPERATION_VIEWS} from './operations.js';
import {SETTINGS_VIEWS} from './settings.js';
import {SYSTEM_VIEWS} from './system.js';

const PARAMETERS = new URLSearchParams(location.search);
const PLATFORM = PARAMETERS.get('platform') === 'mobile' ? 'mobile' : 'web';
const PAGE = PAGES.find(entry=>entry.id===PARAMETERS.get('page')) ?? PAGES[0];
const VIEWS = {...INVENTORY_VIEWS,...OPERATION_VIEWS,...SETTINGS_VIEWS,...SYSTEM_VIEWS};
const AUTH_IDS = ['login','register','invite'];
const FORM_IDS = ['form','security','ai','profile-edit','stocktake-detail'];
document.body.dataset.platform = PLATFORM;
document.body.dataset.page = PAGE.id;
document.body.classList.toggle('mobile',PLATFORM==='mobile');
document.title = `${PAGE.title} · ${PLATFORM==='mobile'?'移动端':'Web'} · 归位视觉稿`;

function navItem({id,label,iconName}) {
  const isActive = id === PAGE.id || id === 'locations' && ['container','map','browse','mobile-map'].includes(PAGE.id);
  return `<a class="nav-item ${isActive?'active':''}" href="${href(id)}" ${isActive?'aria-current="page"':''}>${icon(iconName)}<span>${label}</span></a>`;
}
function sidebar() {
  const groups = [{label:'物品与空间',items:[['home','首页','house'],['overview','库存检索','grid-2x2'],['locations','空间位置','map-pin']]},{label:'家庭日常',items:[['activity','操作记录','history'],['scan','拍照录入','camera'],['stocktakes','家庭盘点','clipboard-check'],['reminders','提醒中心','bell']]},{label:'整理与设置',items:[['categories','分类管理','shapes'],['tags','标签管理','tags'],['manage','管理中心','briefcase-business']]}];
  return `<aside class="sidebar">${brand()}<a class="household-switch" href="${href('household')}">${icon('house')}<span class="grow">温暖的家</span>${icon('chevron-down')}</a>${button({label:'新增物品',page:'form',iconName:'plus',tone:'primary'})}${groups.map(group=>`<nav class="nav-group" aria-label="${group.label}"><p class="nav-label">${group.label}</p>${group.items.map(([id,label,iconName])=>navItem({id,label,iconName})).join('')}</nav>`).join('')}<div class="sidebar-footer">${navItem({id:'profile',label:'小林的账户',iconName:'user-round'})}<small>InPlace · 每一件，都有归处。</small></div></aside>`;
}
function brand() {return `<a class="brand" href="${href('home')}"><img src="assets/logo.png" alt="归位标志"><span>归位 <small>INPLACE</small></span></a>`;}
function topBar() {
  if(AUTH_IDS.includes(PAGE.id)) return `<header class="workspace-top">${brand()}</header>`;
  if(PLATFORM==='mobile') return `<header class="workspace-top">${brand()}<a class="household-mini" href="${href('household')}">温暖的家 ${icon('chevron-down')}</a></header>`;
  return `<header class="workspace-top"><span>温暖的家 <span class="top-slash">/</span> ${PAGE.title}</span><div class="inline">${search('搜索家庭库存')}<a href="${href('reminders')}" aria-label="提醒中心">${icon('bell')}</a><a class="avatar" href="${href('profile')}" aria-label="我的账户">林</a></div></header>`;
}
function headingActions() {
  const registry = {
    home:[{label:'批量管理',iconName:'list-checks',className:'secondary-action'},{label:'新增',page:'form',iconName:'plus',tone:'primary'}],
    overview:[{label:'新增物品',page:'form',iconName:'plus',tone:'primary'}],
    locations:[{label:'新增位置',page:'form',iconName:'plus',tone:'primary'}],
    item:[{label:'打印标签',page:'labels',iconName:'printer',className:'secondary-action'},{label:'编辑',page:'form',iconName:'pencil'}],
    container:[{label:'编辑',page:'form',iconName:'pencil'}],
    categories:[{label:'新增分类',iconName:'plus',tone:'primary'}], tags:[{label:'新增标签',iconName:'plus',tone:'primary'}],
    reports:[{label:'打印报告',iconName:'printer',tone:'primary'}],
  };
  return (registry[PAGE.id]??[]).map(button).join('');
}
function pageHeading() {
  const title = PAGE.id==='home' ? '家的日常，一目了然。' : PAGE.title;
  return `<div class="page-heading"><div><p class="eyebrow">${PAGE.group==='设计系统'?'DESIGN SYSTEM':'INPLACE / '+({库存:'INVENTORY',管理:'ORGANIZE',采集:'CAPTURE',账户:'ACCOUNT','协作与工具':'HOUSEHOLD',补充:'PLATFORM'}[PAGE.group]??'INVENTORY')}</p><h1>${title}</h1><p>${PAGE.description}</p></div><div class="heading-actions">${headingActions()}</div></div>`;
}
function bottomNav() {
  if(PLATFORM!=='mobile'||AUTH_IDS.includes(PAGE.id)||FORM_IDS.includes(PAGE.id)||PAGE.id==='mobile-map') return '';
  const groups={home:['home'],overview:['overview','item','container','browse'],scan:['scan','scan-code','resolve'],profile:['profile','profile-edit','ai','security','data','household','about']};
  const activeId=Object.entries(groups).find(([,ids])=>ids.includes(PAGE.id))?.[0]??'manage';
  return `<nav class="bottom-nav" aria-label="主导航">${PRIMARY_NAV.map(entry=>`<a class="${entry.id===activeId?'active':''}" href="${href(entry.id)}" ${entry.id===activeId?'aria-current="page"':''}>${icon(entry.icon)}<span>${entry.label}</span></a>`).join('')}</nav>`;
}
function render() {
  const content=VIEWS[PAGE.id]();
  const stamp=`<p class="design-stamp">INPLACE · 静态视觉稿 / 示例数据 <span>·</span> <a href="index.html">返回设计总览 ↗</a></p>`;
  if(AUTH_IDS.includes(PAGE.id)) return `<div class="auth-shell">${topBar()}<main id="main-content">${content}${stamp}</main></div>`;
  if(PAGE.id==='mobile-map') return `<main id="main-content" class="bridge-canvas">${content}${stamp}</main>`;
  return `<div class="${PLATFORM==='mobile'?'mobile-shell':'desktop-shell'}">${PLATFORM==='web'?sidebar():''}<div class="workspace">${topBar()}<main id="main-content" class="workspace-body">${pageHeading()}${content}${stamp}</main></div>${bottomNav()}</div>`;
}
document.getElementById('app').innerHTML=render();

function showPreviewNote(text) {
  const note=document.getElementById('preview-note');
  note.textContent=text;
  note.hidden=false;
}
document.addEventListener('click',event=>{
  if(!(event.target instanceof Element)) return;
  const choice=event.target.closest('[data-choice]');
  if(choice){
    event.preventDefault();
    const navigation={位置树:'locations',资产地图:'map'};
    if(navigation[choice.textContent.trim()]) { location.href=href(navigation[choice.textContent.trim()]);return; }
    choice.parentElement.querySelectorAll('[data-choice]').forEach(item=>{item.classList.remove('active');item.removeAttribute('aria-current');if(item.tagName==='BUTTON')item.setAttribute('aria-pressed','false');});
    choice.classList.add('active');
    choice.setAttribute(choice.tagName==='BUTTON'?'aria-pressed':'aria-current',choice.tagName==='BUTTON'?'true':'page');
    showPreviewNote('分组样式预览。当前为静态视觉稿，数据不随筛选变化。');
  }
  const action=event.target.closest('[data-preview]');
  if(action)showPreviewNote(`「${action.dataset.preview}」为视觉示意，未连接真实业务。`);
});
document.addEventListener('submit',event=>event.preventDefault());
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.getElementById('preview-note').hidden=true;});
window.designReady=true;
