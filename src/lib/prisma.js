import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const connectionString = resolveDatabaseUrl(process.env);

  if (!connectionString) {
    throw new Error("DATABASE_URL nao configurada e variaveis DB_* incompletas.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
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
