const fs = require("node:fs/promises");
const path = require("node:path");
const request = require("supertest");
const repository = require("../src/imports/import-repository");

jest.mock("../src/imports/import-repository");

const app = require("../src/app");
const uploadDir = path.join("storage", "uploads");

afterEach(async () => {
  jest.clearAllMocks();

  const files = await fs.readdir(uploadDir).catch(() => []);
  await Promise.all(files.map((file) => fs.unlink(path.join(uploadDir, file))));
});

describe("Importações", () => {
  it("recebe um arquivo e registra a importação", async () => {
    repository.create.mockResolvedValue();

    const response = await request(app)
      .post("/v1/imports")
      .attach("file", Buffer.from("linha de teste"), "data.txt");

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      import_id: expect.any(String),
      status: "PENDING",
    });
    expect(repository.create).toHaveBeenCalledWith({
      id: response.body.import_id,
      originalName: "data.txt",
      storedName: expect.any(String),
      fileSize: 14,
    });
  });

  it("rejeita a requisição sem arquivo", async () => {
    const response = await request(app).post("/v1/imports");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("FILE_REQUIRED");
  });

  it("remove o arquivo quando não consegue registrar a importação", async () => {
    repository.create.mockRejectedValue(new Error("Falha no banco"));
    const consoleError = jest.spyOn(console, "error").mockImplementation();

    const response = await request(app)
      .post("/v1/imports")
      .attach("file", Buffer.from("linha de teste"), "data.txt");

    const files = await fs.readdir(uploadDir);

    expect(response.status).toBe(500);
    expect(files).toHaveLength(0);
    consoleError.mockRestore();
  });

  it("retorna o estado de uma importação", async () => {
    repository.findById.mockResolvedValue({
      id: "import-id",
      original_name: "data.txt",
      file_size: 100,
      status: "PENDING",
      processed_lines: 0,
      valid_lines: 0,
      invalid_lines: 0,
      error_message: null,
      created_at: new Date("2026-08-19T12:00:00Z"),
      started_at: null,
      finished_at: null,
    });

    const response = await request(app).get("/v1/imports/import-id");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      import_id: "import-id",
      file_name: "data.txt",
      file_size: 100,
      status: "PENDING",
    });
  });

  it("retorna erro quando a importação não existe", async () => {
    repository.findById.mockResolvedValue(null);

    const response = await request(app).get("/v1/imports/inexistente");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("IMPORT_NOT_FOUND");
  });
});
