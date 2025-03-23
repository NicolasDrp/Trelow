import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a singleton instance of PrismaClient
export const prisma = globalThis.prisma || new PrismaClient();

// In development, attach the instance to the global object to prevent multiple instances
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
