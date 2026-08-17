import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ───────────────────────────── Enums ───────────────────────────── */

export const userRole = pgEnum("user_role", [
  "student",
  "guardian",
  "tutor",
  "admin",
]);

export const gender = pgEnum("gender", ["female", "male", "unspecified"]);

/** Arabic, Hebrew, English — a tutor may teach in more than one. */
export const instructionLanguage = pgEnum("instruction_language", [
  "ar",
  "he",
  "en",
]);

export const lessonMode = pgEnum("lesson_mode", ["online", "in_person"]);

export const lessonLocation = pgEnum("lesson_location", [
  "student_home",
  "tutor_home",
  "public_place",
  "online",
]);

export const subjectLevel = pgEnum("subject_level", [
  "elementary",
  "middle",
  "high",
  "academic",
  "enrichment",
  "professional",
]);

export const verificationStatus = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);

export const verificationType = pgEnum("verification_type", [
  "id",
  "degree",
  "teaching_certificate",
]);

export const inquiryStatus = pgEnum("inquiry_status", [
  "new",
  "viewed",
  "replied",
  "accepted",
  "declined",
  "expired",
]);

export const lessonStatus = pgEnum("lesson_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const reviewStatus = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

/** Free at launch; PRO is deferred until roughly 300 active tutors exist. */
export const planTier = pgEnum("plan_tier", ["free", "pro"]);

export const district = pgEnum("district", [
  "galilee",
  "triangle",
  "negev",
  "mixed",
  "carmel-golan",
  "jerusalem",
  "other",
]);

/* ──────────────────────────── Identity ──────────────────────────── */

/**
 * Mirrors `auth.users`. The foreign key to Supabase's auth schema is added in
 * SQL migration rather than here, since Drizzle does not model cross-schema
 * references cleanly.
 *
 * Phone is the primary identifier: this market is mobile-first with low
 * card-app adoption, so signup is phone OTP and email is optional.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    roles: userRole("roles").array().notNull().default(["student"]),
    phone: varchar("phone", { length: 20 }).notNull(),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    email: varchar("email", { length: 255 }),
    /**
     * A person's name isn't translated, but it is transliterated. Onboarding
     * asks for the Arabic form and, optionally, a Latin one; Hebrew is optional
     * and falls back. Resolution order lives in `toTutorName()`.
     */
    fullName: varchar("full_name", { length: 120 }).notNull(),
    fullNameHe: varchar("full_name_he", { length: 120 }),
    fullNameLatin: varchar("full_name_latin", { length: 120 }),
    displayName: varchar("display_name", { length: 120 }),
    avatarUrl: text("avatar_url"),
    locale: varchar("locale", { length: 5 }).notNull().default("ar"),
    gender: gender("gender").notNull().default("unspecified"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_phone_key").on(table.phone),
    index("profiles_email_idx").on(table.email),
  ],
);

/* ──────────────────────────── Taxonomy ──────────────────────────── */

/**
 * Seeded from `lib/taxonomy/subjects.ts`, which is the source of truth and
 * lives in git. `aliases` is what makes one search box work across Arabic,
 * Hebrew, English and Arabizi.
 */
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull(),
    categorySlug: varchar("category_slug", { length: 80 }).notNull(),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    nameHe: varchar("name_he", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    aliases: text("aliases").array().notNull().default([]),
    levels: subjectLevel("levels").array().notNull().default([]),
    /** Bagrut unit counts (3/4/5) where the subject is examined by units. */
    units: smallint("units").array().notNull().default([]),
    isExam: boolean("is_exam").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("subjects_slug_key").on(table.slug),
    index("subjects_category_idx").on(table.categorySlug),
    index("subjects_featured_idx").on(table.featured),
  ],
);

/**
 * The facet the incumbent lacks entirely — no Arab locality appears anywhere in
 * the incumbent's geography, which is why they have no supply there.
 */
export const localities = pgTable(
  "localities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull(),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    nameHe: varchar("name_he", { length: 160 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    aliases: text("aliases").array().notNull().default([]),
    district: district("district").notNull(),
    population: integer("population"),
    arabMajority: boolean("arab_majority").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
  },
  (table) => [
    uniqueIndex("localities_slug_key").on(table.slug),
    index("localities_district_idx").on(table.district),
  ],
);

/* ───────────────────────────── Tutors ───────────────────────────── */

export const tutors = pgTable(
  "tutors",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 120 }).notNull(),
    headlineAr: varchar("headline_ar", { length: 200 }),
    headlineHe: varchar("headline_he", { length: 200 }),
    headlineEn: varchar("headline_en", { length: 200 }),
    bioAr: text("bio_ar"),
    bioHe: text("bio_he"),
    bioEn: text("bio_en"),
    yearsExperience: smallint("years_experience"),
    /** One line, e.g. "BSc Mathematics — University of Haifa". */
    educationAr: varchar("education_ar", { length: 200 }),
    educationHe: varchar("education_he", { length: 200 }),
    educationEn: varchar("education_en", { length: 200 }),
    teachesOnline: boolean("teaches_online").notNull().default(true),
    teachesInPerson: boolean("teaches_in_person").notNull().default(false),
    travelRadiusKm: smallint("travel_radius_km"),
    /**
     * A first-class filter, unlike the incumbent, which has none. Covers the
     * unserved case of Hebrew-taught university courses explained in Arabic.
     */
    languagesOfInstruction: instructionLanguage("languages_of_instruction")
      .array()
      .notNull()
      .default(["ar"]),
    verificationStatus: verificationStatus("verification_status")
      .notNull()
      .default("unverified"),
    /**
     * Denormalised counters, maintained by trigger. Rated 1–10 — so precision
     * has to be 4, not 3: numeric(3,2) tops out at 9.99 and rejects a tutor
     * with a perfect 10.00 average.
     */
    ratingAvg: numeric("rating_avg", { precision: 4, scale: 2 }),
    ratingCount: integer("rating_count").notNull().default(0),
    lessonsCount: integer("lessons_count").notNull().default(0),
    responseTimeSec: integer("response_time_sec"),
    planTier: planTier("plan_tier").notNull().default("free"),
    /** Permanent badge for the first 300 tutors. Costs nothing, buys loyalty. */
    foundingTutor: boolean("founding_tutor").notNull().default(false),
    isActive: boolean("is_active").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tutors_slug_key").on(table.slug),
    index("tutors_active_idx").on(table.isActive, table.publishedAt),
    index("tutors_rating_idx").on(table.ratingAvg, table.ratingCount),
    index("tutors_plan_idx").on(table.planTier),
  ],
);

export const tutorSubjects = pgTable(
  "tutor_subjects",
  {
    /*
     * Surrogate key rather than (tutor, subject, level).
     *
     * `level` is legitimately null — an exam like the psychometric has no
     * school level — and primary key columns cannot be null. The unique index
     * below uses NULLS NOT DISTINCT so a tutor still can't list the same
     * subject twice at "no level"; plain unique treats each null as different
     * and would let duplicates through.
     */
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    level: subjectLevel("level"),
    /** Whole shekels per hour. */
    pricePerHour: integer("price_per_hour").notNull(),
  },
  (table) => [
    index("tutor_subjects_tutor_idx").on(table.tutorId),
    index("tutor_subjects_subject_idx").on(table.subjectId, table.pricePerHour),
    // The NULLS NOT DISTINCT unique constraint lives in
    // supabase/sql/003_constraints.sql — drizzle-orm 0.45 can't express it.
  ],
);

export const tutorLocalities = pgTable(
  "tutor_localities",
  {
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    localityId: uuid("locality_id")
      .notNull()
      .references(() => localities.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.tutorId, table.localityId] }),
    index("tutor_localities_locality_idx").on(table.localityId),
  ],
);

export const availability = pgTable(
  "availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    /** 0 = Sunday, matching the Israeli working week. */
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [index("availability_tutor_idx").on(table.tutorId)],
);

export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    isAvailable: boolean("is_available").notNull().default(false),
  },
  (table) => [
    index("availability_exceptions_tutor_idx").on(table.tutorId, table.date),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    type: verificationType("type").notNull(),
    fileUrl: text("file_url").notNull(),
    status: verificationStatus("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verifications_tutor_idx").on(table.tutorId, table.status)],
);

/* ──────────────────────────── Students ──────────────────────────── */

export const students = pgTable(
  "students",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gradeLevel: varchar("grade_level", { length: 40 }),
    schoolLocalityId: uuid("school_locality_id").references(
      () => localities.id,
    ),
    /**
     * Guardian-mediated accounts are the norm here, not an edge case — parents
     * are far more likely to be the transacting party. Required under 16.
     */
    guardianProfileId: uuid("guardian_profile_id").references(
      () => profiles.id,
      { onDelete: "set null" },
    ),
    birthYear: smallint("birth_year"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("students_guardian_idx").on(table.guardianProfileId)],
);

/* ───────────────────── Connection & transaction ─────────────────── */

/** The primary conversion event. Search → inquiry is the funnel metric. */
export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id),
    level: subjectLevel("level"),
    mode: lessonMode("mode").notNull(),
    localityId: uuid("locality_id").references(() => localities.id),
    message: text("message"),
    budgetMax: integer("budget_max"),
    preferredTimes: text("preferred_times"),
    status: inquiryStatus("status").notNull().default("new"),
    /** Which surface produced the lead — profile, search card, landing page. */
    source: varchar("source", { length: 40 }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inquiries_tutor_idx").on(table.tutorId, table.status),
    index("inquiries_student_idx").on(table.studentId),
    index("inquiries_created_idx").on(table.createdAt),
    /*
     * A thread is a merged timeline of every inquiry and message between one
     * pair, so the pair — not the conversation id — is what the thread query
     * filters on. `conversations` is unique on the same pair, which is what
     * makes that equivalence hold.
     */
    index("inquiries_pair_idx").on(
      table.studentId,
      table.tutorId,
      table.createdAt,
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("conversations_pair_key").on(table.studentId, table.tutorId),
    index("conversations_recent_idx").on(table.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    attachments: jsonb("attachments").notNull().default([]),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

/**
 * Lessons are self-reported by the tutor. There is no escrow and no
 * platform-held money: card-app adoption in this market runs at 16% against 34%
 * nationally, so gating on payment would kill adoption. Payment happens
 * directly between student and tutor.
 */
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMin: smallint("duration_min").notNull().default(60),
    mode: lessonMode("mode").notNull(),
    location: lessonLocation("location"),
    localityId: uuid("locality_id").references(() => localities.id),
    price: integer("price"),
    /** Tutor's own Zoom or Meet link. No built-in classroom at MVP. */
    meetingUrl: text("meeting_url"),
    status: lessonStatus("status").notNull().default("scheduled"),
    reportedBy: uuid("reported_by").references(() => profiles.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lessons_tutor_idx").on(table.tutorId, table.scheduledAt),
    index("lessons_student_idx").on(table.studentId, table.scheduledAt),
    index("lessons_status_idx").on(table.status),
  ],
);

/** Ratings run 1–10, the Israeli convention the incumbent also uses. */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id").references(() => lessons.id, {
      onDelete: "set null",
    }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    title: varchar("title", { length: 160 }),
    body: text("body"),
    status: reviewStatus("status").notNull().default("pending"),
    tutorReply: text("tutor_reply"),
    moderatedBy: uuid("moderated_by").references(() => profiles.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reviews_tutor_idx").on(table.tutorId, table.status),
    uniqueIndex("reviews_lesson_key").on(table.lessonId),
  ],
);

/* ─────────────────── Monetisation (Phase 5) ─────────────────────── */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    plan: planTier("plan").notNull(),
    periodMonths: smallint("period_months").notNull().default(1),
    status: varchar("status", { length: 30 }).notNull().default("active"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    provider: varchar("provider", { length: 40 }),
    providerRef: varchar("provider_ref", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("subscriptions_tutor_idx").on(table.tutorId, table.status)],
);

/* ──────────────────── Instrumentation & safety ──────────────────── */

/** Phone reveal is a tracked lead event, not a leak. The incumbent does this. */
export const phoneReveals = pgTable(
  "phone_reveals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutors.profileId, { onDelete: "cascade" }),
    viewerId: uuid("viewer_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("phone_reveals_tutor_idx").on(table.tutorId),
    /* Serves the per-viewer hourly cap that keeps this from being a scraper. */
    index("phone_reveals_viewer_idx").on(table.viewerId, table.createdAt),
  ],
);

export const searchEvents = pgTable(
  "search_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    query: text("query"),
    filters: jsonb("filters").notNull().default({}),
    resultCount: integer("result_count").notNull().default(0),
    locale: varchar("locale", { length: 5 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("search_events_created_idx").on(table.createdAt)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    targetType: varchar("target_type", { length: 30 }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_status_idx").on(table.status),
    index("reports_target_idx").on(table.targetType, table.targetId),
  ],
);

/**
 * A one-way cut of contact. Enforced symmetrically at write time — if either
 * party has blocked the other, neither can open an inquiry or send a message.
 *
 * Deliberately not a soft "mute": in a market this tightly networked, a woman
 * who wants a man to stop contacting her needs the platform to actually stop
 * him, and the person doing the blocking is never told whether it took effect
 * on the other side.
 */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    // The reverse direction: "has anyone blocked me?" is asked as often as
    // "whom have I blocked?", and both run on every send.
    index("blocks_blocked_idx").on(table.blockedId),
  ],
);
