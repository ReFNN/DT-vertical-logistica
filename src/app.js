const express = require("express");
const multer = require("multer");
const importRouter = require("./imports/import-router");
const orderRouter = require("./orders/order-router");

const app = express();

app.use(express.json());
app.use("/v1/imports", importRouter);
app.use("/v1/orders", orderRouter);

app.get("/health", (request, response) => {
  response.json({ status: "ok" });
});

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({
      error: "FILE_TOO_LARGE",
      message: "O arquivo deve ter no máximo 2 GB.",
    });
  }

  if (error instanceof multer.MulterError) {
    return response.status(400).json({
      error: "INVALID_UPLOAD",
      message: "Envie apenas um arquivo no campo file.",
    });
  }

  console.error("Erro não tratado", error);

  return response.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Não foi possível concluir a operação.",
  });
});

module.exports = app;
