const database = require("../database");

async function resetProcessing() {
  await database.execute(`
    UPDATE imports
    SET status = 'PENDING', started_at = NULL
    WHERE status = 'PROCESSING'
  `);
}

async function claimNext() {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(`
      SELECT id, stored_name
      FROM imports
      WHERE status = 'PENDING'
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

    if (!rows[0]) {
      await connection.commit();
      return null;
    }

    await connection.execute(
      `UPDATE imports
       SET status = 'PROCESSING',
           processed_lines = 0,
           valid_lines = 0,
           invalid_lines = 0,
           error_message = NULL,
           started_at = NOW(),
           finished_at = NULL
       WHERE id = ?`,
      [rows[0].id],
    );

    await connection.execute("DELETE FROM import_errors WHERE import_id = ?", [
      rows[0].id,
    ]);

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveBatch(importId, records) {
  if (records.length === 0) {
    return;
  }

  const connection = await database.getConnection();
  const users = [...new Map(records.map((record) => [record.userId, record])).values()];
  const orders = [...new Map(records.map((record) => [record.orderId, record])).values()];

  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO users (import_id, user_id, name)
       VALUES ${users.map(() => "(?, ?, ?)").join(", ")}
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      users.flatMap((record) => [importId, record.userId, record.name]),
    );

    await connection.query(
      `INSERT INTO orders (import_id, order_id, user_id, purchase_date)
       VALUES ${orders.map(() => "(?, ?, ?, ?)").join(", ")}
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         purchase_date = VALUES(purchase_date)`,
      orders.flatMap((record) => [
        importId,
        record.orderId,
        record.userId,
        record.purchaseDate,
      ]),
    );

    await connection.query(
      `INSERT INTO order_items (
         import_id, order_id, product_id, value_cents, source_line
       ) VALUES ${records.map(() => "(?, ?, ?, ?, ?)").join(", ")}
       ON DUPLICATE KEY UPDATE source_line = VALUES(source_line)`,
      records.flatMap((record) => [
        importId,
        record.orderId,
        record.productId,
        record.valueCents,
        record.sourceLine,
      ]),
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveErrors(importId, errors) {
  if (errors.length === 0) {
    return;
  }

  await database.query(
    `INSERT INTO import_errors (import_id, line_number, reason, raw_line)
     VALUES ${errors.map(() => "(?, ?, ?, ?)").join(", ")}
     ON DUPLICATE KEY UPDATE
       reason = VALUES(reason),
       raw_line = VALUES(raw_line)`,
    errors.flatMap((error) => [
      importId,
      error.lineNumber,
      error.reason,
      error.rawLine,
    ]),
  );
}

async function updateProgress(importId, processed, valid, invalid) {
  await database.execute(
    `UPDATE imports
     SET processed_lines = ?, valid_lines = ?, invalid_lines = ?
     WHERE id = ?`,
    [processed, valid, invalid, importId],
  );
}

async function cleanupData(importId) {
  const connection = await database.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM order_items WHERE import_id = ?", [importId]);
    await connection.execute("DELETE FROM orders WHERE import_id = ?", [importId]);
    await connection.execute("DELETE FROM users WHERE import_id = ?", [importId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function complete(importId, processed, valid) {
  await database.execute(
    `UPDATE imports
     SET status = 'COMPLETED',
         processed_lines = ?,
         valid_lines = ?,
         invalid_lines = 0,
         finished_at = NOW()
     WHERE id = ?`,
    [processed, valid, importId],
  );
}

async function fail(importId, processed, valid, invalid, message) {
  await database.execute(
    `UPDATE imports
     SET status = 'FAILED',
         processed_lines = ?,
         valid_lines = ?,
         invalid_lines = ?,
         error_message = ?,
         finished_at = NOW()
     WHERE id = ?`,
    [processed, valid, invalid, message.slice(0, 2000), importId],
  );
}

async function failUnexpected(importId, message) {
  await database.execute(
    `UPDATE imports
     SET status = 'FAILED', error_message = ?, finished_at = NOW()
     WHERE id = ?`,
    [message.slice(0, 2000), importId],
  );
}

module.exports = {
  resetProcessing,
  claimNext,
  saveBatch,
  saveErrors,
  updateProgress,
  cleanupData,
  complete,
  fail,
  failUnexpected,
};
