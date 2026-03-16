UPDATE "Project" p
SET phase = CASE
  WHEN EXISTS (
    SELECT 1
    FROM "ProjectContract" c
    WHERE c."projectId" = p.id
  ) THEN 'contratado'::"ProjectPhase"
  ELSE 'banco'::"ProjectPhase"
END;