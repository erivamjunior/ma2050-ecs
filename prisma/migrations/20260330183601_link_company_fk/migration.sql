-- Add nullable company links first so existing rows can be backfilled safely.
ALTER TABLE "ProjectBidding" ADD COLUMN "companyId" UUID;
ALTER TABLE "ProjectContract" ADD COLUMN "companyId" UUID;

-- Backfill from the company registry using the persisted CNPJ snapshot.
UPDATE "ProjectBidding" AS bidding
SET "companyId" = company."id"
FROM "Company" AS company
WHERE company."cnpj" = bidding."winnerCnpj";

UPDATE "ProjectContract" AS contract
SET "companyId" = company."id"
FROM "Company" AS company
WHERE company."cnpj" = contract."contractorCnpj";

-- Abort the migration if any legacy row still cannot be linked.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ProjectBidding" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed for ProjectBidding.companyId';
  END IF;

  IF EXISTS (SELECT 1 FROM "ProjectContract" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed for ProjectContract.companyId';
  END IF;
END $$;

ALTER TABLE "ProjectBidding" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "ProjectContract" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "ProjectBidding"
  ADD CONSTRAINT "ProjectBidding_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectContract"
  ADD CONSTRAINT "ProjectContract_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
