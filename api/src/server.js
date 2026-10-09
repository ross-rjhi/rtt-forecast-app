import { createApp } from './app.js';
import { createDb } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp(createDb());

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
