const request = require("supertest");
const repository = require("../src/orders/order-repository");

jest.mock("../src/orders/order-repository");

const app = require("../src/app");

afterEach(() => {
  jest.clearAllMocks();
});

describe("Consulta de pedidos", () => {
  it("retorna os pedidos agrupados por usuário", async () => {
    repository.findImport.mockResolvedValue({ id: "import-id" });
    repository.findOrderIds.mockResolvedValue({
      orderIds: [123],
      hasNext: false,
    });
    repository.findRows.mockResolvedValue([
      {
        user_id: "1",
        name: "Zarelli",
        order_id: "123",
        purchase_date: "2021-12-01",
        product_id: "111",
        value_cents: "51224",
      },
      {
        user_id: "1",
        name: "Zarelli",
        order_id: "123",
        purchase_date: "2021-12-01",
        product_id: "122",
        value_cents: "51224",
      },
    ]);

    const response = await request(app).get("/v1/orders");

    expect(response.status).toBe(200);
    expect(response.headers["x-page"]).toBe("1");
    expect(response.headers["x-has-next"]).toBe("false");
    expect(response.body).toEqual([
      {
        user_id: 1,
        name: "Zarelli",
        orders: [
          {
            order_id: 123,
            total: "1024.48",
            date: "2021-12-01",
            products: [
              { product_id: 111, value: "512.24" },
              { product_id: 122, value: "512.24" },
            ],
          },
        ],
      },
    ]);
  });

  it("aplica os filtros e a paginação", async () => {
    repository.findImport.mockResolvedValue({ id: "import-id" });
    repository.findOrderIds.mockResolvedValue({ orderIds: [], hasNext: false });
    repository.findRows.mockResolvedValue([]);

    const response = await request(app).get(
      "/v1/orders?import_id=import-id&order_id=123&start_date=2021-01-01&end_date=2021-12-31&page=2&limit=50",
    );

    expect(response.status).toBe(200);
    expect(repository.findImport).toHaveBeenCalledWith("import-id");
    expect(repository.findOrderIds).toHaveBeenCalledWith({
      importId: "import-id",
      orderId: 123,
      startDate: "2021-01-01",
      endDate: "2021-12-31",
      page: 2,
      limit: 50,
    });
  });

  it("rejeita um intervalo de datas inválido", async () => {
    const response = await request(app).get(
      "/v1/orders?start_date=2021-12-31&end_date=2021-01-01",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INVALID_DATE_RANGE");
    expect(repository.findImport).not.toHaveBeenCalled();
  });

  it("rejeita uma data inexistente", async () => {
    const response = await request(app).get(
      "/v1/orders?start_date=2021-02-30",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INVALID_DATE");
  });

  it("retorna erro quando não há importação concluída", async () => {
    repository.findImport.mockResolvedValue(null);

    const response = await request(app).get("/v1/orders");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("IMPORT_NOT_AVAILABLE");
  });
});
