const repository = require("./order-repository");

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parsePositiveInteger(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function formatMoney(value) {
  const cents = BigInt(value);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function groupRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const userId = Number(row.user_id);
    const orderId = Number(row.order_id);

    if (!groups.has(userId)) {
      groups.set(userId, {
        user: { user_id: userId, name: row.name },
        orders: new Map(),
      });
    }

    const group = groups.get(userId);

    if (!group.orders.has(orderId)) {
      group.orders.set(orderId, {
        orderId,
        date: row.purchase_date,
        totalCents: 0n,
        products: [],
      });
    }

    const order = group.orders.get(orderId);
    const valueCents = BigInt(row.value_cents);

    order.totalCents += valueCents;
    order.products.push({
      product_id: Number(row.product_id),
      value: formatMoney(valueCents),
    });
  }

  return [...groups.values()].map((group) => ({
    ...group.user,
    orders: [...group.orders.values()].map((order) => ({
      order_id: order.orderId,
      total: formatMoney(order.totalCents),
      date: order.date,
      products: order.products,
    })),
  }));
}

async function list(request, response) {
  const { import_id: importId, order_id: orderIdValue } = request.query;
  const startDate = request.query.start_date;
  const endDate = request.query.end_date;
  const page = parsePositiveInteger(request.query.page, 1);
  const limit = parsePositiveInteger(request.query.limit, 100);

  if (orderIdValue !== undefined && !/^\d{1,10}$/.test(orderIdValue)) {
    return response.status(400).json({
      error: "INVALID_ORDER_ID",
      message: "O ID do pedido é inválido.",
    });
  }

  if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
    return response.status(400).json({
      error: "INVALID_DATE",
      message: "As datas devem estar no formato YYYY-MM-DD.",
    });
  }

  if (startDate && endDate && startDate > endDate) {
    return response.status(400).json({
      error: "INVALID_DATE_RANGE",
      message: "A data inicial não pode ser posterior à data final.",
    });
  }

  if (!page || !limit || limit > 500) {
    return response.status(400).json({
      error: "INVALID_PAGINATION",
      message: "Página e limite devem ser positivos, com limite máximo de 500.",
    });
  }

  const importData = await repository.findImport(importId);

  if (!importData) {
    return response.status(404).json({
      error: "IMPORT_NOT_AVAILABLE",
      message: "Nenhuma importação concluída foi encontrada.",
    });
  }

  const { orderIds, hasNext } = await repository.findOrderIds({
    importId: importData.id,
    orderId: orderIdValue === undefined ? undefined : Number(orderIdValue),
    startDate,
    endDate,
    page,
    limit,
  });
  const rows = await repository.findRows(importData.id, orderIds);

  response.set({
    "X-Page": String(page),
    "X-Page-Size": String(limit),
    "X-Has-Next": String(hasNext),
  });

  return response.json(groupRows(rows));
}

module.exports = { list, groupRows };
