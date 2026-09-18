// backend/nest-api/src/database/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { typeOrmOptions } from './typeorm.options';

export default new DataSource(typeOrmOptions);