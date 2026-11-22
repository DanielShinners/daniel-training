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
  const sheets = [];
  for (const el of doc.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    const n = el.cloneNode(true);
    if (n.tagName === 'LINK') sheets.push(new Promise(r => { n.onload = n.onerror = r; }));
    document.head.appendChild(n);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await Promise.race([Promise.all(sheets), wait(3000)]);
  const loader = document.getElementById('yc-loader');
  if (doc.title) document.title = doc.title;
  const scripts = [...doc.body.querySelectorAll('script')];
  scripts.forEach(s => s.remove());
  document.body.innerHTML = doc.body.innerHTML;
  if (loader) document.body.appendChild(loader);
  for (const s of scripts) {
    const n = document.createElement('script');
    if (s.type) n.type = s.type;
    n.textContent = s.textContent;
    document.body.appendChild(n);
  }
  await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(1500)]);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  document.documentElement.classList.add('ready');
  if (loader) { loader.classList.add('out'); setTimeout(() => loader.remove(), 400); }
  if (location.hash && location.hash !== '#ground') document.querySelector(location.hash)?.scrollIntoView();
}
