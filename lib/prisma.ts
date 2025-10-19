// lib/prisma.ts
import { PrismaClient } from '@/lib/generated/prisma';

// Declare a global variable to hold the Prisma Client instance.
// Using 'globalThis' ensures it works across different environments.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create the Prisma Client instance. If it already exists on the global object,
// reuse it. Otherwise, create a new one.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // Optional: Log all queries to the console for debugging.
  });

// In non-production environments, assign the created instance to the global
// object. This prevents creating new connections on every hot-reload.

// one more thing to notice is that hot reloading in next.js works different than that in express.js
//  The app does not restart. Instead, it re-imports changed modules into memory
// Old modules still live in memory. This line would be completely useless in express.js
// source https://medium.com/@simarpalsingh13/stop-copy-pasting-globalthis-prisma-hot-reload-in-node-js-vs-next-js-explained-e664ec6ced23
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;