// backend/nest-api/test/e2e/payload-fixture.ts
//
// Nest reads a few columns of Payload's tables directly (users for role
// checks, products for stock). The e2e harness creates exactly those columns
// instead of booting Payload, so Nest's tests stay independent of the CMS.
// Column names match Payload's generated schema.

import type { Pool } from 'pg';

export const PAYLOAD_SCHEMA = 'payload_schema';

export async function createPayloadFixtureSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE SCHEMA "${PAYLOAD_SCHEMA}";

    CREATE TABLE "${PAYLOAD_SCHEMA}"."users" (
      "id" serial PRIMARY KEY,
      "email" varchar NOT NULL UNIQUE,
      "role" varchar NOT NULL DEFAULT 'customer'
    );

    CREATE TABLE "${PAYLOAD_SCHEMA}"."products" (
      "id" serial PRIMARY KEY,
      "name" varchar NOT NULL,
      "status" varchar NOT NULL DEFAULT 'draft',
      "price" numeric NOT NULL,
      "sale_price" numeric,
      "is_on_sale" boolean DEFAULT false,
      "stock" numeric,
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );
  `);
}

export interface FixtureUser {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'customer';
  // Stands in for a Payload session token. Shaped like a JWT because the
  // admin guard rejects anything else before calling Payload.
  payloadToken: string;
}

export interface FixtureProductInput {
  name?: string;
  status?: 'published' | 'draft';
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean;
  stock?: number | null;
}

export interface FixtureProductRow {
  id: number;
  name: string;
  status: string;
  price: number;
  salePrice: number | null;
  isOnSale: boolean;
  stock: number | null;
}

const toNumber = (value: string | null): number | null =>
  value === null ? null : Number(value);

export async function readProduct(
  pool: Pool,
  id: number,
): Promise<FixtureProductRow | null> {
  const { rows } = await pool.query(
    `SELECT "id", "name", "status", "price", "sale_price", "is_on_sale", "stock"
     FROM "${PAYLOAD_SCHEMA}"."products" WHERE "id" = $1`,
    [id],
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    price: Number(row.price),
    salePrice: toNumber(row.sale_price),
    isOnSale: row.is_on_sale === true,
    stock: toNumber(row.stock),
  };
}
