/**
 * Script de Auditoria Automatizada de Design System (8pt Grid & Despoluição Zen)
 * Uso: node scripts/audit-design.js
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  path.join(__dirname, '..', 'src', 'app'),
  path.join(__dirname, '..', 'src', 'components', 'momentus'),
];

const VALID_8PT_VALUES = new Set([
  0, 1, 2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 104, 112, 120, 128, 144, 160, 192, 240, 256, 320, 400, 416, 440, 520, 544, 680, 9999,
]);

// Propriedades auditadas para valores fora do grid de 8pt
const SPACING_PROPS_REGEX = /(?:padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|gap|rowGap|columnGap):\s*(\d+)/g;

let totalFilesChecked = 0;
let warningsFound = 0;

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  totalFilesChecked++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  lines.forEach((line, index) => {
    // Ignorar linhas comentadas
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    let match;
    while ((match = SPACING_PROPS_REGEX.exec(line)) !== null) {
      const val = parseInt(match[1], 10);
      if (!VALID_8PT_VALUES.has(val)) {
        console.warn(`⚠️ [8pt Grid Warning] ${relativePath}:${index + 1} -> "${match[0]}" (${val}px não é harmônico com 4/8pt)`);
        warningsFound++;
      }
    }
  });
}

console.log('🔍 Iniciando auditoria do 8pt Grid System no Momentus...');
TARGET_DIRS.forEach(scanDir);

console.log('----------------------------------------------------');
console.log(`📊 Total de arquivos auditados: ${totalFilesChecked}`);
if (warningsFound === 0) {
  console.log('✅ SUCESSO: Nenhum espaçamento fora do grid de 8pt encontrado nos componentes e telas principais!');
  process.exit(0);
} else {
  console.log(`⚠️ Encontrados ${warningsFound} avisos de espaçamento que podem ser refatorados.`);
  process.exit(0);
}
