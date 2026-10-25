// Runs the API server and the Vite dev server together; Ctrl+C stops both.
import { spawn } from 'node:child_process';

const children = ['server', 'dev'].map((script) =>
  spawn('npm', ['run', script], { stdio: 'inherit', env: process.env }),
);

let closing = false;
const stopAll = (code = 0) => {
  if (closing) return;
  closing = true;
  children.forEach((c) => c.kill('SIGTERM'));
  process.exitCode = code;
};

children.forEach((c) => c.on('exit', (code) => stopAll(code ?? 0)));
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => stopAll(0)));
