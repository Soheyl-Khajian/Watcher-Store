import * as migration_20250725_011657_AddUserRole from './20250725_011657_AddUserRole';

export const migrations = [
  {
    up: migration_20250725_011657_AddUserRole.up,
    down: migration_20250725_011657_AddUserRole.down,
    name: '20250725_011657_AddUserRole'
  },
];
