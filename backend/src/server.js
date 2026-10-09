const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/database');

async function main() {
  await connectDB();
  app.listen(config.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${config.PORT}`);
  });
}

main();
