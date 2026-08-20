const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { once } = require("node:events");

const sizeMb = Number(process.argv[2] || 100);
const defaultPath = path.join(
  "storage",
  "benchmarks",
  `arquivo-${sizeMb}mb.txt`,
);
const outputPath = path.resolve(process.argv[3] || defaultPath);
const record =
  "0000000070                              Palmer Prosacco00000007530000000003     1836.7420210308";

async function generate() {
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    throw new Error("Informe um tamanho válido em MB.");
  }

  await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });

  const output = fs.createWriteStream(outputPath);
  const line = `${record}\n`;
  const totalLines = Math.ceil((sizeMb * 1024 * 1024) / Buffer.byteLength(line));

  for (let index = 0; index < totalLines; index++) {
    if (!output.write(line)) {
      await once(output, "drain");
    }
  }

  output.end();
  await once(output, "finish");

  const stats = await fsPromises.stat(outputPath);
  console.log(`Arquivo criado: ${outputPath}`);
  console.log(`Linhas: ${totalLines}`);
  console.log(`Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

generate().catch((error) => {
  console.error("Falha ao gerar o arquivo", error.message);
  process.exit(1);
});
