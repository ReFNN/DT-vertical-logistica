require("dotenv").config({ quiet: true });

const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");
const databaseConfig = require("./database-config");

const migrationsPath = path.join(__dirname, "..", "database", "migrations");

async function migrate() {
  const connection = await mysql.createConnection({
    ...databaseConfig,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        name VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = (await fs.readdir(migrationsPath))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const [rows] = await connection.query("SELECT name FROM migrations");
    const executed = new Set(rows.map((row) => row.name));

    for (const file of files) {
      if (executed.has(file)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsPath, file), "utf8");
      await connection.query(sql);
      await connection.execute("INSERT INTO migrations (name) VALUES (?)", [file]);
      console.log(`Migração executada: ${file}`);
    }
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error("Falha ao executar as migrações", error);
  process.exit(1);
});
