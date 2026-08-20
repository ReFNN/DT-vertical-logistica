require("dotenv").config({ quiet: true });

const repository = require("./imports/processing-repository");
const { processNext } = require("./imports/import-worker");

const interval = Number(process.env.WORKER_INTERVAL_MS || 2000);
const wait = () => new Promise((resolve) => setTimeout(resolve, interval));

async function start() {
  await repository.resetProcessing();
  console.log("Worker iniciado");

  while (true) {
    try {
      const processed = await processNext();

      if (!processed) {
        await wait();
      }
    } catch (error) {
      console.error("Falha ao buscar importações", error.message);
      await wait();
    }
  }
}

start().catch((error) => {
  console.error("Falha ao iniciar o worker", error.message);
  process.exit(1);
});
