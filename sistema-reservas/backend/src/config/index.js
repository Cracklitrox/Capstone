import dotenv from 'dotenv';

dotenv.config();

export default {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {},
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false
  }
};

export const development = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: {},
};

export const test = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false
};

export const production = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false
};
