-- deploy/postgres/roles.sql
--
-- One login role per service, each owning only its own schema. Run by the
-- db-roles job (docker-compose.prod.yml) as the database superuser on every
-- deploy, before any migration: safe to run again, and it brings an older
-- database (everything owned by the superuser) to the same state.
--
--   payload_app  owns the Payload schema. Payload and its migrations
--                connect as this role.
--   nest_app     owns the Nest schema. Nest and its migrations connect as
--                this role. Its access to Payload's tables is granted
--                separately, after Payload's migrations have created them
--                (nest-access.sql).
--
-- Neither role can create schemas, reach the other's schema (beyond those
-- grants), or create anything in public.
--
-- psql variables (set by the job): dbname, payload_schema, nest_schema
-- Environment: PAYLOAD_DB_PASSWORD, NEST_DB_PASSWORD (read here, so they
-- never appear on a command line)

\set ON_ERROR_STOP on
\getenv payload_password PAYLOAD_DB_PASSWORD
\getenv nest_password NEST_DB_PASSWORD

-- Roles: created once, password set every run (so changing it in the
-- environment and redeploying rotates it).
SELECT 'CREATE ROLE payload_app LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'payload_app')
\gexec
SELECT 'CREATE ROLE nest_app LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nest_app')
\gexec

ALTER ROLE payload_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  PASSWORD :'payload_password';
ALTER ROLE nest_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  PASSWORD :'nest_password';

-- The database: only these two roles may connect, and nobody creates
-- objects in public.
REVOKE ALL ON DATABASE :"dbname" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"dbname" TO payload_app, nest_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Each schema, owned by its service's role.
CREATE SCHEMA IF NOT EXISTS :"payload_schema" AUTHORIZATION payload_app;
CREATE SCHEMA IF NOT EXISTS :"nest_schema" AUTHORIZATION nest_app;

-- Hands a schema and everything in it to a role. Needed for databases from
-- before these roles existed, where the superuser owns the tables; a role
-- must own a table to alter it in a migration. Sequences that belong to a
-- table move with it.
CREATE FUNCTION pg_temp.hand_over(target_schema text, new_owner text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  item record;
BEGIN
  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', target_schema, new_owner);

  FOR item IN
    SELECT c.relname,
           CASE c.relkind
             WHEN 'S' THEN 'SEQUENCE'
             WHEN 'v' THEN 'VIEW'
             WHEN 'm' THEN 'MATERIALIZED VIEW'
             ELSE 'TABLE'
           END AS kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
      AND pg_get_userbyid(c.relowner) <> new_owner
      AND NOT (
        c.relkind = 'S' AND EXISTS (
          SELECT FROM pg_depend d
          WHERE d.classid = 'pg_class'::regclass
            AND d.objid = c.oid
            AND d.deptype IN ('a', 'i')
        )
      )
  LOOP
    EXECUTE format('ALTER %s %I.%I OWNER TO %I',
      item.kind, target_schema, item.relname, new_owner);
  END LOOP;

  -- Enum and domain types (Payload's select fields are enums).
  FOR item IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = target_schema
      AND t.typtype IN ('e', 'd')
      AND pg_get_userbyid(t.typowner) <> new_owner
  LOOP
    EXECUTE format('ALTER TYPE %I.%I OWNER TO %I',
      target_schema, item.typname, new_owner);
  END LOOP;
END
$$;

\o /dev/null
SELECT pg_temp.hand_over(:'payload_schema', 'payload_app');
SELECT pg_temp.hand_over(:'nest_schema', 'nest_app');
\o

-- Nest may look into Payload's schema; which columns it may use is set in
-- nest-access.sql. Payload has no access to Nest's schema.
GRANT USAGE ON SCHEMA :"payload_schema" TO nest_app;
REVOKE ALL ON SCHEMA :"nest_schema" FROM payload_app;
