import {WEBSITE_ROUTES,WEBSITE_ALIASES,LEGACY_WEBSITE_PAGES,RETIRED_WEBSITE_PAGES,LEGACY_ENTRY_FILES,resolveLegacyEntry} from '../../app/services/siteRoutes.js';
export {LEGACY_ENTRY_FILES};
export const auxiliaryFiles=new Set(['robots.txt','sitemap.xml','404.html']);
export const releaseHtmlFiles=new Set([...Object.values(WEBSITE_ROUTES).map(p=>(p==='/'?'':p.slice(1))+'index.html'),...Object.keys(LEGACY_ENTRY_FILES)]);
export function bridgeHtml(file){
 const fallback=LEGACY_ENTRY_FILES[file];if(!fallback)throw Error('Unknown entry bridge: '+file);
 const script=`const WEBSITE_ROUTES=${JSON.stringify(WEBSITE_ROUTES)},WEBSITE_ALIASES=${JSON.stringify(WEBSITE_ALIASES)};const resolve=${resolveLegacyEntry.toString()};const next=resolve(location)||${JSON.stringify(fallback)};location.replace(new URL(next,location.origin).href);`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Nourishland</title><link rel="canonical" href="https://nourishland.org${fallback}"><script>${script}</script><noscript><meta http-equiv="refresh" content="0;url=${fallback}"></noscript></head><body><a href="${fallback}">Continue to Nourishland</a></body></html>\n`;
}
export function sitemapXml(){return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(WEBSITE_ROUTES).map(p=>`<url><loc>https://nourishland.org${p}</loc></url>`).join('\n')}\n</urlset>\n`;}
export function robotsTxt(){return 'User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nDisallow: /admin/\nDisallow: /account/\nDisallow: /app/\nDisallow: /xr-api/\nSitemap: https://nourishland.org/sitemap.xml\n';}
export function notFoundHtml(){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found · Nourishland</title><style>body{margin:0;min-height:100svh;display:grid;place-content:center;background:#eee9dc;color:#244d3c;font:17px/1.6 system-ui;padding:24px;box-sizing:border-box}main{max-width:600px}h1{font-size:clamp(36px,6vw,60px);font-weight:500;line-height:1.1;letter-spacing:-.04em}a{color:inherit;text-underline-offset:5px;display:inline-flex;align-items:center;min-height:44px;margin-right:24px}small{letter-spacing:.12em}</style></head><body><main data-current-website-error><small>NOURISHLAND</small><h1>Let’s find your way.</h1><p>This page is no longer here. Explore Nourishland from the current website.</p><nav aria-label="Find a page"><a href="/">Home</a><a href="/education/">Education</a><a href="/platform/">Platform</a></nav></main></body></html>\n';}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function routingBlock(){
 const lines=['# BEGIN Nourishland canonical routes','DirectoryIndex index.html index.php','ErrorDocument 404 /404.html','ErrorDocument 410 /404.html','<IfModule mod_rewrite.c>','RewriteEngine On','# Only visitor entry routes change; application files and API paths stay intact.'];
 for(const [old,destination]of Object.entries(LEGACY_WEBSITE_PAGES))lines.push(`RewriteRule ^${escape(old.slice(1,-1))}/?$ ${destination} [R=301,L,NE]`);
 for(const old of RETIRED_WEBSITE_PAGES)lines.push(`RewriteRule ^${escape(old.slice(1,-1))}/?$ - [G,L]`);
 lines.push('RewriteRule ^(?:wp-sitemap(?:-[a-z0-9-]+)?|sitemap_index)\\.xml$ /sitemap.xml [R=301,L,NE]',
 'RewriteCond %{THE_REQUEST} \\s/+index\\.php(?:[?\\s]) [NC]',
 'RewriteCond %{REQUEST_METHOD} ^(?:GET|HEAD)$',
 'RewriteCond %{QUERY_STRING} !(?:^|&)rest_route= [NC]',
 'RewriteRule ^index\\.php$ / [R=301,L,NE]',
 'RewriteRule ^(?:(?:xr|app)/)?v2(?:/mobile-study)?(?:/index\\.html)?/?$ / [R=301,L,NE]',
 'RewriteRule ^(?:xr|app)/v2/full-3d(?:/index\\.html)?/?$ /experience/ [R=301,L,NE]',
 'RewriteRule ^(?:xr|app)/(creator|demos|account|admin|field)(?:/index\\.html)?/?$ /$1/ [R=301,L,NE]',
 'RewriteRule ^(?:xr|app)/platform\\.html$ /explorer/ [R=301,L,NE]',
 'RewriteCond %{QUERY_STRING} ^$',
 'RewriteRule ^(?:xr|app)(?:/index\\.html)?/?$ /platform/ [R=301,L,NE]',
 'RewriteRule ^xr(?:/index\\.html)?/?$ /app/ [R=301,L,NE]',
 '# THE_REQUEST prevents an internal DirectoryIndex lookup becoming a redirect loop.',
 'RewriteCond %{THE_REQUEST} \\s/+[^?\\s]*index\\.html(?:[?\\s]) [NC]',
 'RewriteRule ^((?:education|platform|food-forests(?:/story|/guide)?|immersive-learning|places|hillyards|collaborate|about|contact|creator|explorer|field|demos|account|admin)/)?index\\.html$ /$1 [R=301,L,NE]',
 '# WordPress administration and REST remain reachable; retired public theme pages do not.',
 'RewriteCond %{REQUEST_URI} !^/(?:xr|xr-api|api|app|wp-admin|wp-json)(?:/|$) [NC]',
 'RewriteCond %{REQUEST_FILENAME} !-f','RewriteCond %{REQUEST_FILENAME} !-d',
 'RewriteRule ^ - [R=404,L]','</IfModule>','# END Nourishland canonical routes','');
 return lines.join('\n');
}
