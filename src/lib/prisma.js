import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
  });
}

function getPrismaClient() {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = createPrismaClient();
  }

  return globalForPrisma.__prisma;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, property) {
      return Reflect.get(getPrismaClient(), property);
    },
  },
);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma ??= null;
}
