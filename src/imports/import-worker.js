const { processImport } = require("./import-processor");
const repository = require("./processing-repository");

async function processNext() {
  const importData = await repository.claimNext();

  if (!importData) {
    return false;
  }

  console.log(`Processando importação ${importData.id}`);

  try {
    const result = await processImport(importData);
    console.log(
      `Importação ${importData.id} finalizada com status ${result.status}`,
    );
  } catch (error) {
    await repository.cleanupData(importData.id);
    await repository.failUnexpected(importData.id, error.message);
    console.error(`Falha ao processar a importação ${importData.id}`, error.message);
  }

  return true;
}

module.exports = { processNext };
