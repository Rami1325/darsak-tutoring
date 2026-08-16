CREATE TYPE "public"."district" AS ENUM('galilee', 'triangle', 'negev', 'mixed', 'carmel-golan', 'jerusalem', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'viewed', 'replied', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."instruction_language" AS ENUM('ar', 'he', 'en');--> statement-breakpoint
CREATE TYPE "public"."lesson_location" AS ENUM('student_home', 'tutor_home', 'public_place', 'online');--> statement-breakpoint
CREATE TYPE "public"."lesson_mode" AS ENUM('online', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."subject_level" AS ENUM('elementary', 'middle', 'high', 'academic', 'enrichment', 'professional');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'guardian', 'tutor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('id', 'degree', 'teaching_certificate');--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_available" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"inquiry_id" uuid,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_id" uuid NOT NULL,
	"subject_id" uuid,
	"level" "subject_level",
	"mode" "lesson_mode" NOT NULL,
	"locality_id" uuid,
	"message" text,
	"budget_max" integer,
	"preferred_times" text,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"source" varchar(40),
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_min" smallint DEFAULT 60 NOT NULL,
	"mode" "lesson_mode" NOT NULL,
	"location" "lesson_location",
	"locality_id" uuid,
	"price" integer,
	"meeting_url" text,
	"status" "lesson_status" DEFAULT 'scheduled' NOT NULL,
	"reported_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "localities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name_ar" varchar(160) NOT NULL,
	"name_he" varchar(160) NOT NULL,
	"name_en" varchar(160) NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"district" "district" NOT NULL,
	"population" integer,
	"arab_majority" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_reveals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"viewer_id" uuid,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"roles" "user_role"[] DEFAULT '{"student"}' NOT NULL,
	"phone" varchar(20) NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"email" varchar(255),
	"full_name" varchar(120) NOT NULL,
	"full_name_he" varchar(120),
	"full_name_latin" varchar(120),
	"display_name" varchar(120),
	"avatar_url" text,
	"locale" varchar(5) DEFAULT 'ar' NOT NULL,
	"gender" "gender" DEFAULT 'unspecified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" varchar(30) NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid,
	"tutor_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"title" varchar(160),
	"body" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"tutor_reply" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"locale" varchar(5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"grade_level" varchar(40),
	"school_locality_id" uuid,
	"guardian_profile_id" uuid,
	"birth_year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"category_slug" varchar(80) NOT NULL,
	"name_ar" varchar(160) NOT NULL,
	"name_he" varchar(160) NOT NULL,
	"name_en" varchar(160) NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"levels" "subject_level"[] DEFAULT '{}' NOT NULL,
	"units" smallint[] DEFAULT '{}' NOT NULL,
	"is_exam" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"plan" "plan_tier" NOT NULL,
	"period_months" smallint DEFAULT 1 NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"provider" varchar(40),
	"provider_ref" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_localities" (
	"tutor_id" uuid NOT NULL,
	"locality_id" uuid NOT NULL,
	CONSTRAINT "tutor_localities_tutor_id_locality_id_pk" PRIMARY KEY("tutor_id","locality_id")
);
--> statement-breakpoint
CREATE TABLE "tutor_subjects" (
	"tutor_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"level" "subject_level",
	"price_per_hour" integer NOT NULL,
	CONSTRAINT "tutor_subjects_tutor_id_subject_id_level_pk" PRIMARY KEY("tutor_id","subject_id","level")
);
--> statement-breakpoint
CREATE TABLE "tutors" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"headline_ar" varchar(200),
	"headline_he" varchar(200),
	"headline_en" varchar(200),
	"bio_ar" text,
	"bio_he" text,
	"bio_en" text,
	"years_experience" smallint,
	"education_ar" varchar(200),
	"education_he" varchar(200),
	"education_en" varchar(200),
	"teaches_online" boolean DEFAULT true NOT NULL,
	"teaches_in_person" boolean DEFAULT false NOT NULL,
	"travel_radius_km" smallint,
	"languages_of_instruction" "instruction_language"[] DEFAULT '{"ar"}' NOT NULL,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"rating_avg" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"lessons_count" integer DEFAULT 0 NOT NULL,
	"response_time_sec" integer,
	"plan_tier" "plan_tier" DEFAULT 'free' NOT NULL,
	"founding_tutor" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutor_id" uuid NOT NULL,
	"type" "verification_type" NOT NULL,
	"file_url" text NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_reported_by_profiles_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_reveals" ADD CONSTRAINT "phone_reveals_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_reveals" ADD CONSTRAINT "phone_reveals_viewer_id_profiles_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_profiles_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_locality_id_localities_id_fk" FOREIGN KEY ("school_locality_id") REFERENCES "public"."localities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_guardian_profile_id_profiles_id_fk" FOREIGN KEY ("guardian_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_localities" ADD CONSTRAINT "tutor_localities_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_localities" ADD CONSTRAINT "tutor_localities_locality_id_localities_id_fk" FOREIGN KEY ("locality_id") REFERENCES "public"."localities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_tutor_id_tutors_profile_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("profile_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_tutor_idx" ON "availability" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX "availability_exceptions_tutor_idx" ON "availability_exceptions" USING btree ("tutor_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_pair_key" ON "conversations" USING btree ("student_id","tutor_id");--> statement-breakpoint
CREATE INDEX "conversations_recent_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "inquiries_tutor_idx" ON "inquiries" USING btree ("tutor_id","status");--> statement-breakpoint
CREATE INDEX "inquiries_student_idx" ON "inquiries" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "inquiries_created_idx" ON "inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lessons_tutor_idx" ON "lessons" USING btree ("tutor_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "lessons_student_idx" ON "lessons" USING btree ("student_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "lessons_status_idx" ON "lessons" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "localities_slug_key" ON "localities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "localities_district_idx" ON "localities" USING btree ("district");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "phone_reveals_tutor_idx" ON "phone_reveals" USING btree ("tutor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_phone_key" ON "profiles" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_tutor_idx" ON "reviews" USING btree ("tutor_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_lesson_key" ON "reviews" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "search_events_created_idx" ON "search_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "students_guardian_idx" ON "students" USING btree ("guardian_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_slug_key" ON "subjects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subjects_category_idx" ON "subjects" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "subjects_featured_idx" ON "subjects" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "subscriptions_tutor_idx" ON "subscriptions" USING btree ("tutor_id","status");--> statement-breakpoint
CREATE INDEX "tutor_localities_locality_idx" ON "tutor_localities" USING btree ("locality_id");--> statement-breakpoint
CREATE INDEX "tutor_subjects_subject_idx" ON "tutor_subjects" USING btree ("subject_id","price_per_hour");--> statement-breakpoint
CREATE UNIQUE INDEX "tutors_slug_key" ON "tutors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tutors_active_idx" ON "tutors" USING btree ("is_active","published_at");--> statement-breakpoint
CREATE INDEX "tutors_rating_idx" ON "tutors" USING btree ("rating_avg","rating_count");--> statement-breakpoint
CREATE INDEX "tutors_plan_idx" ON "tutors" USING btree ("plan_tier");--> statement-breakpoint
CREATE INDEX "verifications_tutor_idx" ON "verifications" USING btree ("tutor_id","status");