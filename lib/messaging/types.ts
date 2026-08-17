import type { LessonMode } from "@/lib/data/types";
import type { Level } from "@/lib/taxonomy/types";

/**
 * View models for the connection layer.
 *
 * One inbox serves both sides of the marketplace: a tutor's "leads" and a
 * student's "messages" are the same rows read from opposite ends. `party` says
 * which end the reader is on, and every surface branches on that rather than on
 * the reader's role — a tutor who is also taking lessons has both.
 */

export type Party = "student" | "tutor";

export type InquiryStatus =
  | "new"
  | "viewed"
  | "replied"
  | "accepted"
  | "declined"
  | "expired";

export type Counterpart = {
  profileId: string;
  name: string;
  /** E.164. Both sides see it once a conversation exists — see `docs/02`. */
  phone: string;
  /** Set when the counterpart is a tutor with a published profile. */
  tutorSlug?: string;
  verified: boolean;
};

export type InquirySummary = {
  id: string;
  subjectSlug?: string;
  level?: Level;
  mode: LessonMode;
  localitySlug?: string;
  message?: string;
  budgetMax?: number;
  preferredTimes?: string;
  status: InquiryStatus;
  createdAt: Date;
  respondedAt?: Date;
};

export type ThreadMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
  readAt?: Date;
};

/** Inquiries and messages, merged into one chronological list. */
export type ThreadItem =
  | { kind: "inquiry"; at: Date; inquiry: InquirySummary }
  | { kind: "message"; at: Date; message: ThreadMessage };

export type ConversationSummary = {
  id: string;
  party: Party;
  counterpart: Counterpart;
  lastActivityAt: Date;
  preview?: string;
  unread: number;
  latestInquiry?: InquirySummary;
};

export type Thread = {
  id: string;
  party: Party;
  /** The reader — needed to tell own messages from the counterpart's. */
  viewerId: string;
  counterpart: Counterpart;
  items: ThreadItem[];
  /**
   * The reader blocked the counterpart. Shown, and reversible.
   *
   * Whether the *counterpart* blocked the reader is deliberately not exposed:
   * telling someone they have been blocked is how a blocked person finds
   * another way to make contact. Both cases collapse into `canSend: false`.
   */
  iBlocked: boolean;
  canSend: boolean;
};
