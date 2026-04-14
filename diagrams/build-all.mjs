/**
 * Genera SVG en static/img/diagrams/ a partir de cada diagrams/*.mmd
 * Requiere: yarn add -D @mermaid-js/mermaid-cli puppeteer (ya en el proyecto)
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const outDir = join(root, 'static', 'img', 'diagrams');
const mmdc = join(root, 'node_modules', '.bin', 'mmdc');

if (!existsSync(mmdc)) {
  console.error('No se encontró mmdc. Ejecuta: yarn install');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

/** Diagramas de secuencia: ancho mayor para que quepan actores y mensajes sin recortar */
const SEQUENCE_WIDE = new Set([
  'postsales-otp-flujo',
  'trpc-secuencia',
  'shield-v1-authorize',
]);

/** Flowcharts muy anchos (arquitectura completa) */
const FLOW_WIDE = new Set(['arquitectura-plataforma-integraciones']);

const files = readdirSync(here).filter((f) => f.endsWith('.mmd') && !f.startsWith('_'));
for (const f of files) {
  const base = f.replace(/\.mmd$/, '');
  const input = join(here, f);
  const output = join(outDir, `${base}.svg`);
  const widthPx = SEQUENCE_WIDE.has(base) ? '4000' : FLOW_WIDE.has(base) ? '3800' : '2200';
  const r = spawnSync(mmdc, ['-i', input, '-o', output, '-b', 'transparent', '-w', widthPx], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if (r.status !== 0) {
    console.error('Fallo al generar:', f);
    process.exit(r.status ?? 1);
  }
}
console.log('Diagramas generados:', files.length, '→', outDir);
