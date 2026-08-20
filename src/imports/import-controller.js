const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const repository = require("./import-repository");

async function create(request, response) {
  if (!request.file) {
    return response.status(400).json({
      error: "FILE_REQUIRED",
      message: "Envie o arquivo no campo file.",
    });
  }

  const id = randomUUID();

  try {
    await repository.create({
      id,
      originalName: path.basename(request.file.originalname).slice(0, 255),
      storedName: request.file.filename,
      fileSize: request.file.size,
    });
  } catch (error) {
    await fs.unlink(request.file.path).catch(() => {});
    throw error;
  }

  return response.status(202).json({
    import_id: id,
    status: "PENDING",
  });
}

async function findById(request, response) {
  const importData = await repository.findById(request.params.id);

  if (!importData) {
    return response.status(404).json({
      error: "IMPORT_NOT_FOUND",
      message: "Importação não encontrada.",
    });
  }

  return response.json({
    import_id: importData.id,
    file_name: importData.original_name,
    file_size: Number(importData.file_size),
    status: importData.status,
    processed_lines: Number(importData.processed_lines),
    valid_lines: Number(importData.valid_lines),
    invalid_lines: Number(importData.invalid_lines),
    error_message: importData.error_message,
    created_at: importData.created_at,
    started_at: importData.started_at,
    finished_at: importData.finished_at,
  });
}

module.exports = { create, findById };
