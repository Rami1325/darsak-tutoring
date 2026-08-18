"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { adminActions, getDb, reports } from "@/lib/db";

/**
 * Moderation actions.
 *
 * **Every one of these re-checks the role.** The gate on `admin/layout.tsx`
 * protects the pages and nothing else: a server action is its own entry point,
 * reachable by anyone who can post to its id, and the layout never runs for it.
 * Relying on the page gate would mean the console is protected only for people
 * who visit the console.
 *
 * There is no second line of defence to fall back on either. Drizzle connects
 * as the database owner and bypasses RLS, so `requireRole("admin")` here is the
 * whole of it.
 */
const resolveSchema = z.object({
  reportId: z.uuid(),
  outcome: z.enum(["actioned", "dismissed"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Writes the audit row.
 *
 * Called in the same statement sequence as the change it describes, never
 * conditionally: a trail with gaps is worse than no trail, because it invites
 * the assumption that an absence means nothing happened.
 */
async function audit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  note?: string | null;
}) {
  await getDb()
    .insert(adminActions)
    .values({
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      note: input.note ?? null,
    });
}

/**
 * Close a report, one way or the other.
 *
 * `actioned` and `dismissed` both close it, and the difference is the only
 * measure of whether reports are worth reading — collapsing them into "closed"
 * throws that away.
 */
export async function resolveReport(formData: FormData) {
  const admin = await requireRole("admin");

  const parsed = resolveSchema.safeParse({
    reportId: formData.get("reportId"),
    outcome: formData.get("outcome"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return;

  // Scoped to an open report: a double submit, or a second moderator on the
  // same queue, must not overwrite the first decision or its timestamp.
  const [updated] = await getDb()
    .update(reports)
    .set({
      status: parsed.data.outcome,
      resolvedBy: admin.id,
      resolvedAt: new Date(),
    })
    .where(and(eq(reports.id, parsed.data.reportId), eq(reports.status, "open")))
    .returning({ id: reports.id });

  if (!updated) return;

  await audit({
    actorId: admin.id,
    action: `report.${parsed.data.outcome}`,
    targetType: "report",
    targetId: updated.id,
    note: parsed.data.note,
  });

  refresh();
}

/**
 * Put it back in the queue.
 *
 * Nothing here is terminal, for the same reason nothing in the lesson
 * lifecycle is: a mis-tap on a 44px button is otherwise a decision nobody can
 * revisit. The reopening is audited too, so the trail records the correction
 * rather than losing the original.
 */
export async function reopenReport(formData: FormData) {
  const admin = await requireRole("admin");

  const reportId = String(formData.get("reportId") ?? "");
  if (!z.uuid().safeParse(reportId).success) return;

  const [updated] = await getDb()
    .update(reports)
    .set({ status: "open", resolvedBy: null, resolvedAt: null })
    .where(eq(reports.id, reportId))
    .returning({ id: reports.id });

  if (!updated) return;

  await audit({
    actorId: admin.id,
    action: "report.reopened",
    targetType: "report",
    targetId: updated.id,
  });

  refresh();
}
