CREATE TABLE IF NOT EXISTS imports (
  id CHAR(36) PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL,
  processed_lines BIGINT UNSIGNED NOT NULL DEFAULT 0,
  valid_lines BIGINT UNSIGNED NOT NULL DEFAULT 0,
  invalid_lines BIGINT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS users (
  import_id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(45) NOT NULL,
  PRIMARY KEY (import_id, user_id),
  CONSTRAINT fk_users_import
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  import_id CHAR(36) NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  purchase_date DATE NOT NULL,
  PRIMARY KEY (import_id, order_id),
  INDEX idx_orders_user (import_id, user_id),
  INDEX idx_orders_date (import_id, purchase_date),
  CONSTRAINT fk_orders_import
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (import_id, user_id) REFERENCES users(import_id, user_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  import_id CHAR(36) NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  value_cents BIGINT UNSIGNED NOT NULL,
  source_line BIGINT UNSIGNED NOT NULL,
  INDEX idx_order_items_order (import_id, order_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (import_id, order_id) REFERENCES orders(import_id, order_id)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_errors (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  import_id CHAR(36) NOT NULL,
  line_number BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NOT NULL,
  raw_line TEXT NOT NULL,
  INDEX idx_import_errors_import (import_id),
  CONSTRAINT fk_import_errors_import
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
);
