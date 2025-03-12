import {config} from "dotenv";
import {drizzle} from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
// import * as schema from "./schema"

config({path: ".env"}); // or .env.local

declare global {
    // eslint-disable-next-line no-var
    var _db: ReturnType<typeof drizzle> | undefined;
};

function createDatabaseConnection() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });
    return drizzle(pool);
}

// export const queries = drizzle(process.env.DATABASE_URL!);

export const db = global._db || createDatabaseConnection();
if (process.env.NODE_ENV !== 'production') {
    global._db = db;
};