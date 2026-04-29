import { spawn } from 'node:child_process';

function normalizeBasePath(input) {
  const raw = (input ?? '').toString().trim();
  const base = raw || '/';
  if (!base.startsWith('/')) {
    throw new Error(`BASE_PATH debe empezar con "/". Recibido: "${base}"`);
  }
  return base.endsWith('/') ? base : `${base}/`;
}

const basePath = normalizeBasePath(process.env.BASE_PATH);

const args = [
  'build',
  '--configuration',
  'production',
  '--base-href',
  basePath,
  '--deploy-url',
  basePath,
];

console.log(`[build:subdir] BASE_PATH=${basePath}`);
console.log(`[build:subdir] ng ${args.join(' ')}`);

const child = spawn('npx', ['ng', ...args], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

