"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const createPrismaClient = () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is not defined");
    }
    // Only import pg in a Node.js environment
    if (typeof window === "undefined") {
        const pool = new pg_1.Pool({ connectionString });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        return new client_1.PrismaClient({
            adapter,
            log: ["error", "warn"],
        });
    }
    throw new Error("Database adapter not configured for this environment");
};
const globalForPrisma = globalThis;
exports.db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.db;
