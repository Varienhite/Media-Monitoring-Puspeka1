-- CreateTable
CREATE TABLE "News" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "media" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Belum diperiksa',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "program" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_keyword_key" ON "Keyword"("keyword");
