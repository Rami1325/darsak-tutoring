ALTER TABLE "tutor_subjects" DROP CONSTRAINT "tutor_subjects_tutor_id_subject_id_level_pk";--> statement-breakpoint
ALTER TABLE "tutor_subjects" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE INDEX "tutor_subjects_tutor_idx" ON "tutor_subjects" USING btree ("tutor_id");