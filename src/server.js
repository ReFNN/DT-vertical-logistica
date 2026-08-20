require("dotenv").config();

const app = require("./app");
const database = require("./database");

const port = Number(process.env.PORT || 3000);

async function start() {
  await database.query("SELECT 1");

  app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar a API", error);
  process.exit(1);
});
