export function normalizeServerUrl(raw: string, allowHttp = false): string {
  const value = raw.trim();
  if (!value) throw new Error('请输入家庭使用的服务器地址');
  let url: URL;
  try { url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`); }
  catch { throw new Error('服务器地址无效，例如 https://home.example.com'); }
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) throw new Error('生产版本仅支持 HTTPS 服务器');
  if (!url.hostname || /\s/.test(value) || url.username || url.password || url.search || url.hash) {
    throw new Error('请填写服务器地址，不要包含账号、密码、查询参数或片段');
  }
  const path = url.pathname.replace(/\/+$/, '');
  url.pathname = !path ? '/api' : path === '/api' || path.startsWith('/api/') || path.endsWith('/api') ? path : `${path}/api`;
  return url.toString().replace(/\/+$/, '');
}
