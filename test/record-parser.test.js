const { parseRecord } = require("../src/imports/record-parser");

const validLine =
  "0000000070                              Palmer Prosacco00000007530000000003     1836.7420210308";

describe("Parser do arquivo legado", () => {
  it("transforma uma linha válida", () => {
    expect(parseRecord(validLine)).toEqual({
      userId: 70,
      name: "Palmer Prosacco",
      orderId: 753,
      productId: 3,
      valueCents: 183674,
      purchaseDate: "2021-03-08",
    });
  });

  it("rejeita uma linha com tamanho incorreto", () => {
    expect(() => parseRecord(validLine.slice(1))).toThrow(
      "A linha deve possuir 95 bytes.",
    );
  });

  it("rejeita um identificador inválido", () => {
    const line = `A${validLine.slice(1)}`;

    expect(() => parseRecord(line)).toThrow("ID do usuário inválido.");
  });

  it("rejeita um valor inválido", () => {
    const line = `${validLine.slice(0, 75)}     18AB.74${validLine.slice(87)}`;

    expect(() => parseRecord(line)).toThrow("Valor do produto inválido.");
  });

  it("aceita um valor com uma casa decimal", () => {
    const line = `${validLine.slice(0, 75)}        80.8${validLine.slice(87)}`;

    expect(parseRecord(line).valueCents).toBe(8080);
  });

  it("rejeita uma data inexistente", () => {
    const line = `${validLine.slice(0, 87)}20210230`;

    expect(() => parseRecord(line)).toThrow("Data da compra inválida.");
  });
});
