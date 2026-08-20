const database = require("../database");

async function findImport(importId) {
  const conditions = ["status = 'COMPLETED'"];
  const params = [];

  if (importId) {
    conditions.push("id = ?");
    params.push(importId);
  }

  const [rows] = await database.query(
    `SELECT id
     FROM imports
     WHERE ${conditions.join(" AND ")}
     ORDER BY finished_at DESC
     LIMIT 1`,
    params,
  );

  return rows[0] || null;
}

async function findOrderIds({
  importId,
  orderId,
  startDate,
  endDate,
  page,
  limit,
}) {
  const conditions = ["import_id = ?"];
  const params = [importId];

  if (orderId !== undefined) {
    conditions.push("order_id = ?");
    params.push(orderId);
  }

  if (startDate) {
    conditions.push("purchase_date >= ?");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("purchase_date <= ?");
    params.push(endDate);
  }

  params.push(limit + 1, (page - 1) * limit);

  const [rows] = await database.query(
    `SELECT order_id
     FROM orders
     WHERE ${conditions.join(" AND ")}
     ORDER BY order_id
     LIMIT ? OFFSET ?`,
    params,
  );

  return {
    orderIds: rows.slice(0, limit).map((row) => row.order_id),
    hasNext: rows.length > limit,
  };
}

async function findRows(importId, orderIds) {
  if (orderIds.length === 0) {
    return [];
  }

  const placeholders = orderIds.map(() => "?").join(", ");
  const [rows] = await database.query(
    `SELECT
       u.user_id,
       u.name,
       o.order_id,
       DATE_FORMAT(o.purchase_date, '%Y-%m-%d') AS purchase_date,
       oi.product_id,
       oi.value_cents
     FROM orders o
     JOIN users u
       ON u.import_id = o.import_id AND u.user_id = o.user_id
     JOIN order_items oi
       ON oi.import_id = o.import_id AND oi.order_id = o.order_id
     WHERE o.import_id = ? AND o.order_id IN (${placeholders})
     ORDER BY u.user_id, o.order_id, oi.id`,
    [importId, ...orderIds],
  );

  return rows;
}

module.exports = { findImport, findOrderIds, findRows };
