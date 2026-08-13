-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "program" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Keyword" ("active", "id", "keyword", "program") SELECT "active", "id", "keyword", "program" FROM "Keyword";
DROP TABLE "Keyword";
ALTER TABLE "new_Keyword" RENAME TO "Keyword";
CREATE UNIQUE INDEX "Keyword_keyword_key" ON "Keyword"("keyword");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
