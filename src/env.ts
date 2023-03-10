import dotenv from "dotenv";

dotenv.config();

const env = {
  db_host: process.env.DB_HOST as string,
  db_user: process.env.DB_USER as string,
  db_password: process.env.DB_PASSWORD as string,
  db_database: process.env.DB_DATABASE as string,
  port: Number(process.env.PORT),
  recaptcha_key: process.env.RECAPTCHA_KEY as string,
  cookie_domain: process.env.COOKIE_DOMAIN as string,
  origin_default: process.env.ORIGIN_DEFAULT as string,
};

new Map(Object.entries(env)).forEach((value, key) => {
  if (value === undefined) {
    throw new Error(`${key} not defined`);
  }
});

export { env };
