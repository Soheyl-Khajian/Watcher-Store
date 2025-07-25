#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create schemas
    CREATE SCHEMA IF NOT EXISTS payload_schema;
    CREATE SCHEMA IF NOT EXISTS nest_schema;

    -- Set the search path for your user
    -- This tells postgres where to look for tables for this user
    ALTER USER $POSTGRES_USER SET search_path TO payload_schema, nest_schema, public;
EOSQL