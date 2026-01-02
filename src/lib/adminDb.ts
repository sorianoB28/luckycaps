import { neon } from "@netlify/neon";

const adminSql = neon(
  process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL
);

export { adminSql as sql };
export default adminSql;
