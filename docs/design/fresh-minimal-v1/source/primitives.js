export const ASSET = 'assets/';
export function href(page, platform = document.body.dataset.platform) {
  const webAliases = {browse:'container','profile-edit':'profile',about:'profile'};
  const target = platform === 'web' ? webAliases[page] ?? page : page;
  return `preview.html?page=${target}&platform=${platform}`;
}
export const icon = (name) => `<img class="icon" src="${ASSET}icons/${name}.svg" alt="" aria-hidden="true">`;
export const art = (name, className = '') => `<img class="${className}" src="${ASSET}${name}.webp" alt="">`;
export const badge = (label, tone = '') => `<span class="badge ${tone}">${label}</span>`;
export function button({label, page, iconName, tone = '', className = ''}) {
  const content = `${iconName ? icon(iconName) : ''}${className.includes('square') ? `<span class="sr-only">${label}</span>` : label}`;
  return page ? `<a class="btn ${tone} ${className}" href="${href(page)}">${content}</a>` : `<button type="button" class="btn ${tone} ${className}" data-preview="${label}">${content}</button>`;
}
export const sectionHeading = (title, page, label = '查看全部') => `<div class="section-heading"><h2>${title}</h2>${page ? `<a href="${href(page)}">${label} ${icon('arrow-up-right')}</a>` : ''}</div>`;
export const panel = (content, className = '') => `<section class="panel ${className}">${content}</section>`;
export const notice = (title, description = '', tone = '') => `<div class="notice ${tone}">${icon(tone === 'danger' ? 'circle-alert' : 'info')}<div><strong>${title}</strong>${description ? `<p>${description}</p>` : ''}</div></div>`;
export const search = (placeholder = '搜索物品、位置或标签') => `<label class="search">${icon('search')}<span class="sr-only">${placeholder}</span><input type="search" placeholder="${placeholder}"><kbd>⌘ K</kbd></label>`;
export const tabs = (labels, active = 0) => `<nav class="tabs" aria-label="页面分组">${labels.map((label, index) => `<a class="${index === active ? 'active' : ''}" href="#" data-choice="tab" ${index === active ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
export const chips = (labels) => `<div class="chips">${labels.map((label, index) => `<button type="button" class="chip ${index === 0 ? 'active' : ''}" data-choice="chip" aria-pressed="${index === 0}">${label}</button>`).join('')}</div>`;
export const metrics = (entries) => `<section class="metrics">${entries.map(([label,value,detail]) => `<div class="metric"><span>${label}</span><strong class="amount">${value}</strong><span>${detail}</span></div>`).join('')}</section>`;
export function field({label, value = '', placeholder = '', type = 'text', hint = '', wide = false, error = ''}) {
  const fieldId = `field-${label.replaceAll(' ','-')}`;
  return `<label class="field ${wide ? 'field-wide' : ''}"><span>${label}</span><input id="${fieldId}" type="${type}" value="${value}" placeholder="${placeholder}" ${error ? `aria-invalid="true" aria-describedby="${fieldId}-error"` : ''}>${hint ? `<small class="field-hint">${hint}</small>` : ''}${error ? `<small class="error" id="${fieldId}-error">${error}</small>` : ''}</label>`;
}
export const selectField = (label, values) => `<label class="field"><span>${label}</span><select>${values.map(value=>`<option>${value}</option>`).join('')}</select></label>`;
export function row({title, subtitle, image, iconName, page, end = '', checked = false}) {
  const tag = page ? 'a' : 'div';
  return `<${tag} class="row" ${page ? `href="${href(page)}"` : ''}>${checked ? `<label class="check-target"><input class="check" type="checkbox" checked aria-label="选择${title}"></label>` : ''}${image || iconName ? `<span class="row-thumb">${image ? art(image) : icon(iconName)}</span>` : ''}<div class="grow"><strong>${title}</strong>${subtitle ? `<p class="sub">${subtitle}</p>` : ''}</div>${end ? `<div class="row-end">${end}</div>` : ''}${page ? icon('chevron-right') : ''}</${tag}>`;
}
export const settingRow = ({title, subtitle, iconName, page, end = ''}) => `<${page ? 'a' : 'div'} class="setting-row" ${page ? `href="${href(page)}"` : ''}><div class="inline grow">${iconName ? `<span class="setting-icon">${icon(iconName)}</span>` : ''}<div class="grow"><strong>${title}</strong>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div>${end}${page ? icon('chevron-right') : ''}</${page ? 'a' : 'div'}>`;
export const progress = (value) => `<div class="progress" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" aria-label="盘点进度"><span style="--progress:${value}%"></span></div>`;
export const footer = (label = '保存修改', page) => `<div class="form-footer">${button({label:'取消',page:'home'})}${button({label,page,tone:'primary',iconName:'check'})}</div>`;
export const emptyState = ({title,description,iconName = 'package-open',action = '新增物品',page = 'form'}) => `<div class="empty-state">${icon(iconName)}<h3>${title}</h3><p>${description}</p>${button({label:action,page,tone:'primary'})}</div>`;

export const ITEMS = [
  {title:'降噪耳机',subtitle:'书房 › 书桌抽屉',image:'item-digital',page:'item',end:badge('在库')},
  {title:'设计与生活',subtitle:'书房 › 开放书架',image:'item-books',page:'item',end:badge('在库')},
  {title:'手冲咖啡器具',subtitle:'厨房 › 餐边柜',image:'item-kitchen',page:'item',end:badge('在库')},
  {title:'家庭急救包',subtitle:'客厅 › 置物柜',image:'item-health',page:'item',end:badge('待补货','warning')},
];
export const itemRows = () => ITEMS.map(entry=>row(entry)).join('');
export const itemCards = () => `<div class="item-grid">${ITEMS.map(entry=>`<a class="item-card" href="${href('item')}"><div class="item-art">${art(entry.image)}${entry.end}</div><div class="item-copy"><h3>${entry.title}</h3><p>${entry.subtitle}</p><p>物品 · 1 件</p></div></a>`).join('')}</div>`;
