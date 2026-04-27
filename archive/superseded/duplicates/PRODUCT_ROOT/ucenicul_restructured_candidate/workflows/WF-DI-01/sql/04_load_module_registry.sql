-- WF-DI-01 / 04_load_module_registry.sql
-- Read-only static registry projection for SQL-contract validation.
WITH registry(module_name, module_type) AS (
  VALUES
    ('task_module', 'executor'),
    ('reminder_module', 'executor'),
    ('memory_module', 'executor'),
    ('improvement_module', 'executor'),
    ('watcher_module_basic', 'observer')
)
SELECT * FROM registry ORDER BY module_name;
