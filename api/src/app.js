import express from 'express';
import { categoriesRouter } from './routes/categories.js';
import { organisationsRouter } from './routes/organisations.js';
import { summaryRouter } from './routes/summary.js';

// Builds the Express app around a Knex instance. Kept separate from server.js so
// tests can run the app against a small test database.
export function createApp(db) {
  const app = express();

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/organisations', organisationsRouter(db));
  app.use('/api/categories', categoriesRouter(db));
  app.use('/api/summary', summaryRouter(db));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // Express 5 sends errors thrown in async handlers here.
  app.use((err, req, res, next) => {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
