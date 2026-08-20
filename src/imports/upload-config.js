const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 2048);

if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
  throw new Error("MAX_FILE_SIZE_MB deve ser um número positivo.");
}

module.exports = {
  maxFileSizeMb,
  maxFileSizeBytes: Math.floor(maxFileSizeMb * 1024 * 1024),
};
