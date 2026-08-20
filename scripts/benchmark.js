const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { parseRecord } = require("../src/imports/record-parser");

const filePath = process.argv[2] && path.resolve(process.argv[2]);

async function benchmark() {
  if (!filePath) {
    throw new Error("Informe o caminho do arquivo.");
  }

  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  const startedAt = process.hrtime.bigint();
  let processed = 0;
  let valid = 0;
  let invalid = 0;
  let peakMemory = process.memoryUsage().rss;

  for await (const line of lines) {
    processed++;

    try {
      parseRecord(line);
      valid++;
    } catch {
      invalid++;
    }

    if (processed % 10000 === 0) {
      peakMemory = Math.max(peakMemory, process.memoryUsage().rss);
    }
  }

  peakMemory = Math.max(peakMemory, process.memoryUsage().rss);

  const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
  const rate = processed / seconds;

  console.log(`Arquivo: ${filePath}`);
  console.log(`Linhas processadas: ${processed}`);
  console.log(`Linhas válidas: ${valid}`);
  console.log(`Linhas inválidas: ${invalid}`);
  console.log(`Tempo: ${seconds.toFixed(2)} segundos`);
  console.log(`Taxa: ${Math.round(rate)} linhas por segundo`);
  console.log(`Memória máxima: ${(peakMemory / 1024 / 1024).toFixed(2)} MB`);
}

benchmark().catch((error) => {
  console.error("Falha ao executar o benchmark", error.message);
  process.exit(1);
});
