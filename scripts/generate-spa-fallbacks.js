const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[SPA Fallback] dist/index.html não encontrado.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Lista de rotas do Expo Router que podem ser requisitadas diretamente pelo navegador
const routes = [
  'login',
  'calendar',
  'focus',
  'stats',
  'more',
  'settings',
  'achievements',
  'templates',
  'updates',
  'legal',
  'onboarding',
  'signup',
  'forgot-password',
  'categories',
];

routes.forEach((route) => {
  // 1. Gera <route>.html (ex: dist/login.html)
  const routeHtmlPath = path.join(distDir, `${route}.html`);
  fs.writeFileSync(routeHtmlPath, indexHtml, 'utf-8');

  // 2. Gera <route>/index.html (ex: dist/login/index.html)
  const routeDirPath = path.join(distDir, route);
  if (!fs.existsSync(routeDirPath)) {
    fs.mkdirSync(routeDirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(routeDirPath, 'index.html'), indexHtml, 'utf-8');
});

// 3. Gera 404.html para hosts estáticos (GitHub Pages, Netlify, etc.)
fs.writeFileSync(path.join(distDir, '404.html'), indexHtml, 'utf-8');

console.log(`[SPA Fallback] Geradas ${routes.length} rotas estáticas e 404.html com sucesso para suporte SPA total.`);

