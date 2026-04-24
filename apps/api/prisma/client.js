"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const globalForPrisma = global;
function stripSslMode(connectionString) {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    return url.toString();
}
function createPrismaClient() {
    const rawUrl = process.env.DATABASE_URL;
    const isLocalhost = /localhost|127\.0\.0\.1|::1/.test(rawUrl);
    // Use verified SSL when NODE_EXTRA_CA_CERTS is set (Docker with RDS CA bundle),
    // otherwise fall back to unverified SSL (Trigger.dev, Vercel, other environments).
    const hasCABundle = !!process.env.NODE_EXTRA_CA_CERTS;
    const ssl = isLocalhost ? undefined : hasCABundle ? true : { rejectUnauthorized: false };
    // Strip sslmode from the connection string to avoid conflicts with the explicit ssl option
    const url = ssl !== undefined ? stripSslMode(rawUrl) : rawUrl;
    const adapter = new adapter_pg_1.PrismaPg({ connectionString: url, ssl });
    return new client_1.PrismaClient({
        adapter,
        transactionOptions: {
            timeout: 60000,
        },
    });
}
exports.db = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.db;
