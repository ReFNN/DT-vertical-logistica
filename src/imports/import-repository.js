const database = require("../database");

async function create({ id, originalName, storedName, fileSize }) {
  await database.execute(
    `INSERT INTO imports (
      id, original_name, stored_name, file_size, status
    ) VALUES (?, ?, ?, ?, 'PENDING')`,
    [id, originalName, storedName, fileSize],
  );
}

async function findById(id) {
  const [rows] = await database.execute(
    `SELECT
      id,
      original_name,
      file_size,
      status,
      processed_lines,
      valid_lines,
      invalid_lines,
      error_message,
      created_at,
      started_at,
      finished_at
    FROM imports
    WHERE id = ?`,
    [id],
  );

  return rows[0] || null;
}

module.exports = { create, findById };
