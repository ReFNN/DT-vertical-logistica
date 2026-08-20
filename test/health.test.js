const request = require("supertest");
const app = require("../src/app");

describe("Rota de saúde", () => {
  it("retorna o estado da aplicação", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
