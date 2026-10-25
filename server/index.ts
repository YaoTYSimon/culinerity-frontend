import { serve } from '@hono/node-server';
import { DEFAULT_DB_PATH, DEFAULT_HOST, DEFAULT_PORT } from './config';
import { openDatabase } from './db';
import {
  SqliteCatalogueRepository,
  SqliteNutritionRepository,
  SqlitePriceRepository,
  SqliteSupportRepository,
} from './repositories';
import { createApp } from './routes';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
const host = process.env.HOST ?? DEFAULT_HOST;
const dbPath = process.env.DB_PATH ?? DEFAULT_DB_PATH;

const db = openDatabase(dbPath);
if ((db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number }).n === 0) {
  console.warn('The database is empty. Run `npm run seed` first.');
}

const app = createApp(
  {
    catalogue: new SqliteCatalogueRepository(db),
    prices: new SqlitePriceRepository(db),
    nutrition: new SqliteNutritionRepository(db),
    support: new SqliteSupportRepository(db),
  },
  { log: (message) => console.error(message) },
);

serve({ fetch: app.fetch, hostname: host, port }, (info) => {
  console.log(`Culinerity API listening on http://${info.address}:${info.port}`);
});

const shutdown = () => {
  db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
