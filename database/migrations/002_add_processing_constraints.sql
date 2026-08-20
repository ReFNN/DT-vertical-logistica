ALTER TABLE order_items
  ADD CONSTRAINT uq_order_items_source UNIQUE (import_id, source_line);

ALTER TABLE import_errors
  ADD CONSTRAINT uq_import_errors_line UNIQUE (import_id, line_number);
