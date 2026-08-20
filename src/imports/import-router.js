const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const multer = require("multer");
const controller = require("./import-controller");
const { maxFileSizeBytes } = require("./upload-config");

const uploadDir = process.env.UPLOAD_DIR || path.join("storage", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (request, file, callback) => {
      callback(null, `${randomUUID()}.txt`);
    },
  }),
  limits: {
    files: 1,
    fileSize: maxFileSizeBytes,
  },
});

const router = express.Router();

router.post("/", upload.single("file"), controller.create);
router.get("/:id", controller.findById);

module.exports = router;
