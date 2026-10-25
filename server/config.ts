import { fileURLToPath } from 'node:url';

export const DEFAULT_DB_PATH = fileURLToPath(new URL('./data/culinerity.db', import.meta.url));
export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 8787;
