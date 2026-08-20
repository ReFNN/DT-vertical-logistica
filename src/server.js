require("dotenv").config({ quiet: true });

const app = require("./app");
const database = require("./database");

const port = Number(process.env.PORT || 3000);
const requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 1800000);

async function start() {
  await database.query("SELECT 1");

  const server = app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
  });

  server.requestTimeout = requestTimeout;
}

start().catch((error) => {
  console.error("Falha ao iniciar a API", error);
  process.exit(1);
});
