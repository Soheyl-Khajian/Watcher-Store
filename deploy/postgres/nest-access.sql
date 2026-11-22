-- deploy/postgres/nest-access.sql
--
-- Exactly the parts of Payload's tables the Nest API uses, column by
-- column. Run by the db-grants job (docker-compose.prod.yml) as the
-- database superuser on every deploy, after Payload's migrations (the
-- tables must exist), before Nest starts.
--
--   users     id, email, role: who a login token belongs to and whether
--             they are an admin (auth/jwt.strategy.ts). Not the password
--             hash or anything else about the customer.
--   products  stock: taken when an order is placed and put back when it
--             is cancelled (products/products.service.ts), touching
--             updated_at; id, status and stock to find the row. Not the
--             price: Nest reads prices through Payload's API.
--
-- Everything is revoked first, so a grant removed from this file is also
-- removed from the database.
--
-- psql variables (set by the job): payload_schema

\set ON_ERROR_STOP on

REVOKE ALL ON ALL TABLES IN SCHEMA :"payload_schema" FROM nest_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA :"payload_schema" FROM nest_app;

GRANT SELECT (id, email, role)
  ON :"payload_schema".users TO nest_app;

GRANT SELECT (id, status, stock), UPDATE (stock, updated_at)
  ON :"payload_schema".products TO nest_app;
