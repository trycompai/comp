"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const createPrismaClient = () => {
  return new client_1.PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: ["error", "warn"],
  });
};
const globalForPrisma = globalThis;
exports.db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = exports.db;
