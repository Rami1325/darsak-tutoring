import { Fragment } from "react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatTime } from "@/lib/format";
import type { LessonSummary } from "@/lib/scheduling/lessons";
import { gridHours, weekGridColumns } from "@/lib/scheduling/constants";
import { israelParts } from "@/lib/scheduling/timezone";
import { threadHref } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type CalendarDay = {
  key: string;
  /** `الثلاثاء` */
  weekdayLabel: string;
  /** `18.8` */
  dateLabel: string;
  /** 0 = Sunday, for looking up the tutor's weekly pattern. */
  weekday: number;
  isToday: boolean;
  isPast: boolean;
};

/**
 * The tutor's week — days across, hours down.
 *
 * The whole day is drawn, empty hours included, which is the one place this
 * differs from the student's slot picker: a student choosing a time has no use
 * for eleven blank rows, but a tutor looking at their week is reading the gaps
 * as much as the bookings. That is what makes it a calendar rather than a list.
 *
 * Columns flow start-to-end, so in Arabic and Hebrew the week runs right to
 * left with Sunday on the right — the same order the incumbent's calendar uses
 * and the order these readers expect — without a single directional override.
 * The grid is `weekGridColumns()`, shared with the picker; at 360px it scrolls
 * sideways rather than crushing seven columns onto a phone.
 *
 * Green is availability, not a booking. That reads backwards for a minute and
 * then never again: green is the colour of a free hour everywhere else in this
 * product, including the picker the student books through, and having it mean
 * "taken" here would be the inconsistency.
 */
export function LessonWeek({
  days,
  lessons,
  openHours,
  locale,
  nowHour,
}: {
  days: CalendarDay[];
  lessons: LessonSummary[];
  /** `weekday:hour` keys from the tutor's weekly pattern. Empty for a student. */
  openHours: Set<string>;
  locale: Locale;
  /** The current hour in Israel time, or null when today is not in this week. */
  nowHour: number | null;
}) {
  const hours = gridHours();

  // Bucketed by the hour a lesson *starts* in. A 17:30 lesson sits in the 17
  // row showing its real time, exactly as a half-hour slot does in the picker.
  const byCell = new Map<string, LessonSummary[]>();
  for (const lesson of lessons) {
    const parts = israelParts(lesson.scheduledAt);
    const key = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}:${parts.hour}`;
    const cell = byCell.get(key);
    if (cell) cell.push(lesson);
    else byCell.set(key, [lesson]);
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        className="grid min-w-max gap-1"
        style={{ gridTemplateColumns: weekGridColumns(days.length, "6.5rem") }}
      >
        <span aria-hidden />
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              "rounded-lg pb-1 pt-1 text-center text-xs font-medium",
              day.isToday
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            <span className="block">{day.weekdayLabel}</span>
            <span className="numeric block">{day.dateLabel}</span>
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <span
              className={cn(
                "numeric flex items-start justify-center pt-2 text-xs",
                hour === nowHour
                  ? "font-semibold text-destructive"
                  : "text-muted-foreground/70",
              )}
            >
              {pad(hour)}
            </span>

            {days.map((day) => {
              const booked = byCell.get(`${day.key}:${hour}`) ?? [];
              const isNow = day.isToday && hour === nowHour;

              if (booked.length > 0) {
                return (
                  <div key={day.key} className="flex flex-col gap-1">
                    {booked.map((lesson) => (
                      <LessonCell
                        key={lesson.id}
                        lesson={lesson}
                        locale={locale}
                        isNow={isNow}
                      />
                    ))}
                  </div>
                );
              }

              const open = openHours.has(`${day.weekday}:${hour}`) && !day.isPast;

              return (
                <span
                  key={day.key}
                  aria-hidden
                  className={cn(
                    "h-14 rounded-lg",
                    open
                      ? "border border-success/30 bg-success/10"
                      : "bg-muted/40",
                    isNow && "ring-1 ring-destructive/40",
                  )}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * One booking in the grid.
 *
 * Links into the thread rather than opening a detail view of its own: the
 * conversation is already where these two people arranged this lesson, and a
 * second place to read about it is a second place to keep in step.
 */
function LessonCell({
  lesson,
  locale,
  isNow,
}: {
  lesson: LessonSummary;
  locale: Locale;
  isNow: boolean;
}) {
  const tone = {
    upcoming: "border-primary/40 bg-primary/15 text-primary hover:bg-primary/25",
    pending:
      "border-warning/50 bg-warning/20 text-warning-foreground hover:bg-warning/30",
    completed: "border-success/40 bg-success/15 text-success hover:bg-success/25",
    cancelled:
      "border-border bg-muted text-muted-foreground line-through hover:bg-muted/80",
    no_show:
      "border-border bg-muted text-muted-foreground line-through hover:bg-muted/80",
  }[lesson.state];

  const className = cn(
    "flex h-14 flex-col justify-center gap-0.5 overflow-hidden rounded-lg border px-2 text-start transition-colors",
    tone,
    isNow && "ring-1 ring-destructive/40",
  );

  const body = (
    <>
      <span className="numeric text-xs font-semibold">
        {formatTime(lesson.scheduledAt, locale)}
      </span>
      <span className="truncate text-xs leading-tight">
        {lesson.counterpart.name}
      </span>
    </>
  );

  if (!lesson.conversationId) {
    return <span className={className}>{body}</span>;
  }

  return (
    <Link href={threadHref(lesson.conversationId)} className={className}>
      {body}
    </Link>
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
