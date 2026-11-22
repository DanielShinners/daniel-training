/* Boots the Yappers Cup page from this folder on a CDN.
   The host (Vercel) serves a tiny shell; this pulls in index.html from the same commit,
   points its relative paths at the CDN, and runs its scripts. index.html still works on its own. */
export async function boot(BASE) {
  const page = /\/terms(\.html)?$/.test(location.pathname) ? 'terms.html' : 'index.html';
  let html = await (await fetch(BASE + page)).text();
  html = html
    .replace(/(["'(])assets\//g, `$1${BASE}assets/`)
    .replace(/href="css\//g, `href="${BASE}css/`)
    .replace(/import\('\.\/js\//g, `import('${BASE}js/`)
    .replace('window.YC_CONFIG = {', `window.YC_CONFIG = {\n    assetBase: "${BASE}",`)
    .replace(/href="index\.html"/g, 'href="/"');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of doc.head.querySelectorAll('style, link[rel="stylesheet"]')) document.head.appendChild(el.cloneNode(true));
  if (doc.title) document.title = doc.title;
  const scripts = [...doc.body.querySelectorAll('script')];
  scripts.forEach(s => s.remove());
  document.body.innerHTML = doc.body.innerHTML;
  for (const s of scripts) {
    const n = document.createElement('script');
    if (s.type) n.type = s.type;
    n.textContent = s.textContent;
    document.body.appendChild(n);
  }
  document.documentElement.classList.add('ready');
  if (location.hash && location.hash !== '#ground') document.querySelector(location.hash)?.scrollIntoView();
}
