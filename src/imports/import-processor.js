const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline");
const { parseRecord } = require("./record-parser");
const repository = require("./processing-repository");

async function processImport(importData, options = {}) {
  const uploadDir = process.env.UPLOAD_DIR || path.join("storage", "uploads");
  const filePath = options.filePath || path.join(uploadDir, importData.stored_name);
  const batchSize = options.batchSize || Number(process.env.BATCH_SIZE || 1000);
  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  const records = [];
  const errors = [];
  let processed = 0;
  let valid = 0;
  let invalid = 0;

  for await (const line of lines) {
    processed++;

    try {
      records.push({ ...parseRecord(line), sourceLine: processed });
      valid++;
    } catch (error) {
      errors.push({
        lineNumber: processed,
        reason: error.message,
        rawLine: line.slice(0, 500),
      });
      invalid++;
    }

    if (records.length >= batchSize) {
      await repository.saveBatch(importData.id, records.splice(0));
    }

    if (errors.length >= batchSize) {
      await repository.saveErrors(importData.id, errors.splice(0));
    }

    if (processed % batchSize === 0) {
      await repository.updateProgress(importData.id, processed, valid, invalid);
    }
  }

  await repository.saveBatch(importData.id, records);
  await repository.saveErrors(importData.id, errors);
  await repository.updateProgress(importData.id, processed, valid, invalid);

  if (processed === 0) {
    await repository.fail(importData.id, 0, 0, 0, "O arquivo está vazio.");
    return { status: "FAILED", processed, valid, invalid };
  }

  if (invalid > 0) {
    await repository.cleanupData(importData.id);
    await repository.fail(
      importData.id,
      processed,
      valid,
      invalid,
      `O arquivo possui ${invalid} linha(s) inválida(s).`,
    );

    return { status: "FAILED", processed, valid, invalid };
  }

  await repository.complete(importData.id, processed, valid);
  await fsPromises.unlink(filePath);

  return { status: "COMPLETED", processed, valid, invalid };
}

module.exports = { processImport };
