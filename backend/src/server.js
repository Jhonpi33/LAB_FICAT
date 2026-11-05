import app from './app.js';
import config from './config/env.js';
import { connectDB } from './config/database.js';

async function main() {
  await connectDB();
  app.listen(config.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${config.PORT}`);
  });
}

main();
