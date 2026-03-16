SELECT phase, COUNT(*)
FROM "Project"
GROUP BY phase
ORDER BY phase;