function parseId(value, field) {
  if (!/^\d{10}$/.test(value)) {
    throw new Error(`${field} inválido.`);
  }

  return Number(value);
}

function parseValue(value) {
  const normalized = value.trim();

  if (!/^\d+\.\d{1,2}$/.test(normalized)) {
    throw new Error("Valor do produto inválido.");
  }

  const [integer, decimal] = normalized.split(".");
  return Number(integer) * 100 + Number(decimal.padEnd(2, "0"));
}

function parseDate(value) {
  if (!/^\d{8}$/.test(value)) {
    throw new Error("Data da compra inválida.");
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Data da compra inválida.");
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function parseRecord(line) {
  const buffer = Buffer.from(line, "utf8");

  if (buffer.length !== 95) {
    throw new Error("A linha deve possuir 95 bytes.");
  }

  const read = (start, end) => buffer.subarray(start, end).toString("utf8");
  const name = read(10, 55).trim();

  if (!name) {
    throw new Error("Nome do usuário inválido.");
  }

  return {
    userId: parseId(read(0, 10), "ID do usuário"),
    name,
    orderId: parseId(read(55, 65), "ID do pedido"),
    productId: parseId(read(65, 75), "ID do produto"),
    valueCents: parseValue(read(75, 87)),
    purchaseDate: parseDate(read(87, 95)),
  };
}

module.exports = { parseRecord };
