const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "postgres",
    password: process.env.DB_PASSWORD || "sql",
    port: process.env.DB_PORT || 5432,
  });

  pool.connect((err, client, release) => {
    if (err) {
      console.error("Error connecting to the database:", err.stack);
    } else {
      console.log("Database connected successfully!");
    }
    release(); // Release the client back to the pool
  });

module.exports = pool;
