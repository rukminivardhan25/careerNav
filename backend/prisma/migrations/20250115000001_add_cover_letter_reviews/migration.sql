-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'VERIFIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "cover_letter_review_requests" (
    "id" SERIAL NOT NULL,
    "cover_letter_id" INTEGER NOT NULL,
    "student_id" VARCHAR(255) NOT NULL,
    "mentor_id" VARCHAR(255) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "mentor_feedback" TEXT,
    "rating" INTEGER,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_letter_review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_cover_letter_review_requests_cover_letter" ON "cover_letter_review_requests"("cover_letter_id");

-- CreateIndex
CREATE INDEX "idx_cover_letter_review_requests_student" ON "cover_letter_review_requests"("student_id");

-- CreateIndex
CREATE INDEX "idx_cover_letter_review_requests_mentor" ON "cover_letter_review_requests"("mentor_id");

-- CreateIndex
CREATE INDEX "idx_cover_letter_review_requests_status" ON "cover_letter_review_requests"("status");

-- AddForeignKey
ALTER TABLE "cover_letter_review_requests" ADD CONSTRAINT "cover_letter_review_requests_cover_letter_id_fkey" FOREIGN KEY ("cover_letter_id") REFERENCES "cover_letters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cover_letter_review_requests" ADD CONSTRAINT "cover_letter_review_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cover_letter_review_requests" ADD CONSTRAINT "cover_letter_review_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

