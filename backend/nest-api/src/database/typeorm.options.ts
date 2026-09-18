// backend/nest-api/src/database/typeorm.options.ts
import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';
import { env } from '../env';

export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  schema: env.NEST_SCHEMA,
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
};