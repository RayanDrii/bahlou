'use strict';
// Connexion par le navigateur habituel de l'élève : il est déjà connecté à my.epitech, avec ses mots de passe.
// Un favori lit les réponses que le site charge pour lui, puis les poste à l'appli, sur ce PC uniquement.
// Aucun cookie, mot de passe ou jeton n'est lu.
const http = require('http');
const crypto = require('crypto');

const PORT = 47631;
const ORIGIN = 'https://my.epitech.eu';
const MAX_BYTES = 8 * 1024 * 1024;

const favori = (secret) => `(()=>{
if(location.origin!=='${ORIGIN}'){alert('Ouvre my.epitech.eu, puis clique sur ce favori.');return}
if(window.__bahlou)return;window.__bahlou=1;
const W={tests:/\\/api\\/students\\/test-results/,evaluations:/\\/api\\/students\\/evaluations/,alerts:/\\/api\\/evaluations\\/validations\\/alerts\\/me/,ongoing:/\\/api\\/units\\/instances\\/projects\\?.*status=ongoing/,upcoming:/\\/api\\/units\\/instances\\/projects\\?.*status=upcoming/},D={};
const key=u=>Object.keys(W).find(k=>W[k].test(u));
const P=XMLHttpRequest.prototype,O=P.open,S=P.send,F=window.fetch;
P.open=function(m,u){this.__u=String(u);return O.apply(this,arguments)};
P.send=function(){this.addEventListener('load',()=>{try{const k=key(this.__u);if(k&&this.status===200)D[k]=JSON.parse(this.responseText)}catch(e){}});return S.apply(this,arguments)};
window.fetch=async function(i,o){const r=await F.call(this,i,o);try{const k=key(String(i&&i.url||i));if(k&&r.ok)D[k]=await r.clone().json()}catch(e){}return r};
const go=p=>{history.pushState({},'',p);dispatchEvent(new PopStateEvent('popstate',{state:{}}))};
const until=(l,t)=>new Promise(r=>{const s=Date.now(),i=setInterval(()=>{if(l.every(k=>D[k])||Date.now()-s>t){clearInterval(i);r()}},150)});
(async()=>{
go('/dashboard');await new Promise(r=>setTimeout(r,500));
go('/me/academic');await until(['tests','evaluations','alerts'],9000);
go('/projects');await until(['ongoing','upcoming'],9000);
P.open=O;P.send=S;window.fetch=F;window.__bahlou=0;
if(!Object.keys(W).every(k=>D[k])){alert('Bahlou : va sur l’accueil de my.epitech, recharge la page avec F5, puis clique à nouveau sur le favori.');return}
const f=document.createElement('form'),t=document.createElement('textarea'),k=document.createElement('input');
f.method='POST';f.action='http://127.0.0.1:${PORT}/recv';f.style.display='none';t.name='d';t.value=JSON.stringify(D);k.name='k';k.value='${secret}';
f.append(t,k);document.body.appendChild(f);f.submit();
})()})()`.replace(/\n/g, '');

const page = (title, body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bahlou</title><style>
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{background:#111113;color:#f2efe6;font:400 17px/1.5 Arial,Helvetica,sans-serif;display:grid;place-items:center;padding:24px}
main{width:100%;max-width:620px}h1{margin:0 0 18px;font:900 clamp(54px,11vw,92px)/.92 Impact,"Arial Narrow",sans-serif;text-transform:uppercase;color:#6f9bff}
ol{padding-left:24px;margin:0 0 22px}li{margin:9px 0}a.f{display:inline-block;padding:16px 30px;margin:0 0 24px;background:#6f9bff;color:#111113;font:900 36px/1 Impact,"Arial Narrow",sans-serif;text-transform:uppercase;text-decoration:none;cursor:grab}
a.g{display:inline-block;padding:14px 20px;background:#26262b;color:#f2efe6;font-weight:700;text-decoration:none}a.g:hover{background:#f2efe6;color:#111113}p{color:#aeaaa1;margin:0 0 14px}
</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`;

const landing = (secret) => page('Une seule fois', `<a class="f" href="javascript:${encodeURIComponent(favori(secret))}" onclick="return false" draggable="true">Bahlou</a>
<ol><li>Glisse ce bouton dans ta barre de favoris. Si elle est cachée, fais un clic droit sur le bouton, puis <b>Marquer ce lien</b> ou <b>Ajouter aux favoris</b>.</li>
<li>Ouvre my.epitech et connecte-toi si besoin.</li>
<li>Clique sur ton favori <b>Bahlou</b>. L'appli se met à jour toute seule.</li></ol>
<a class="g" href="${ORIGIN}/dashboard">Ouvrir my.epitech</a>`);
const DONE = page('C’est bon', '<p>Tes données sont dans Bahlou. Tu peux fermer cet onglet.</p>');
const REFUSED = page('Refusé', '<p>Relance la connexion depuis l’onglet Travail de Bahlou.</p>');

function createBridge({ secret, port = PORT, timeoutMs = 15 * 60 * 1000 }) {
  const expected = Buffer.from(secret);
  const goodKey = (k) => { const b = Buffer.from(String(k || '')); return b.length === expected.length && crypto.timingSafeEqual(b, expected); };
  let srv = null, finish = null, promise = null;

  const end = (res) => {
    if (!finish) return;
    const f = finish;
    finish = null; promise = null;
    clearTimeout(timer);
    srv.close(); srv.closeAllConnections?.();
    srv = null;
    f(res);
  };
  let timer = null;

  const html = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' }); res.end(body); };

  function handle(req, res) {
    // refuse un site tiers qui viserait ce port par son propre nom de domaine
    if (req.headers.host !== `127.0.0.1:${port}`) return html(res, 403, REFUSED);
    if (req.method === 'GET' && req.url === '/') return html(res, 200, landing(secret));
    if (req.method !== 'POST' || req.url !== '/recv') return html(res, 403, REFUSED);
    let size = 0; const parts = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) { html(res, 413, REFUSED); req.destroy(); return; }
      parts.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BYTES) return;
      let data;
      const form = new URLSearchParams(Buffer.concat(parts).toString('utf8'));
      // les navigateurs masquent l'origine vers une adresse locale : seule la clé du favori fait foi
      if (!goodKey(form.get('k'))) return html(res, 403, REFUSED);
      try { data = JSON.parse(form.get('d')); }
      catch { return html(res, 400, REFUSED); }
      if (!data || typeof data !== 'object') return html(res, 400, REFUSED);
      res.on('finish', () => end({ ok: true, data }));
      html(res, 200, DONE);
    });
  }

  return {
    url: `http://127.0.0.1:${port}/`,
    start() {
      if (promise) return promise;
      promise = new Promise((resolve) => {
        finish = resolve;
        srv = http.createServer(handle);
        srv.on('error', () => { const f = finish; finish = null; promise = null; srv = null; clearTimeout(timer); f({ ok: false, error: 'Le port de connexion est déjà utilisé. Ferme l’autre appli Bahlou.' }); });
        srv.listen(port, '127.0.0.1');
        timer = setTimeout(() => end({ ok: false, error: 'La connexion a pris trop de temps.' }), timeoutMs);
      });
      return promise;
    },
    cancel() { end({ ok: false, error: 'Connexion annulée.', cancelled: true }); },
    favori: favori(secret),
  };
}

module.exports = { createBridge, ORIGIN };
