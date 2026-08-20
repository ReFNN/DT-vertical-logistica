const fs = require("node:fs/promises");
const path = require("node:path");
const repository = require("../src/imports/processing-repository");

jest.mock("../src/imports/processing-repository");

const { processImport } = require("../src/imports/import-processor");

const tempDir = path.join("test", "tmp");
const validLine =
  "0000000070                              Palmer Prosacco00000007530000000003     1836.7420210308";

beforeEach(() => {
  repository.saveBatch.mockResolvedValue();
  repository.saveErrors.mockResolvedValue();
  repository.updateProgress.mockResolvedValue();
  repository.cleanupData.mockResolvedValue();
  repository.complete.mockResolvedValue();
  repository.fail.mockResolvedValue();
});

afterEach(async () => {
  jest.clearAllMocks();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("Processamento de importações", () => {
  it("processa um arquivo válido", async () => {
    const filePath = path.join(tempDir, "valid.txt");
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filePath, `${validLine}\n${validLine}\n`);

    const result = await processImport(
      { id: "import-id", stored_name: "valid.txt" },
      { filePath, batchSize: 1 },
    );

    expect(result).toEqual({
      status: "COMPLETED",
      processed: 2,
      valid: 2,
      invalid: 0,
    });
    expect(repository.complete).toHaveBeenCalledWith("import-id", 2, 2);
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it("reprova um arquivo com linha inválida", async () => {
    const filePath = path.join(tempDir, "invalid.txt");
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filePath, `${validLine}\nlinha inválida\n`);

    const result = await processImport(
      { id: "import-id", stored_name: "invalid.txt" },
      { filePath, batchSize: 10 },
    );

    expect(result.status).toBe("FAILED");
    expect(repository.saveErrors).toHaveBeenCalledWith("import-id", [
      expect.objectContaining({
        lineNumber: 2,
        reason: "A linha deve possuir 95 bytes.",
      }),
    ]);
    expect(repository.cleanupData).toHaveBeenCalledWith("import-id");
    expect(repository.fail).toHaveBeenCalledWith(
      "import-id",
      2,
      1,
      1,
      "O arquivo possui 1 linha(s) inválida(s).",
    );
  });
});
