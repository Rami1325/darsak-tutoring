ALTER TABLE "profiles" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;