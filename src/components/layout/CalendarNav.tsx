"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDate, formatWeekday } from "@/lib/date-utils";

interface CalendarNavProps {
  channelId: string;
  currentDate: string;
  availableDates: string[];
}

export default function CalendarNav({
  channelId,
  currentDate,
  availableDates,
}: CalendarNavProps) {
  const router = useRouter();
  const currentIdx = availableDates.indexOf(currentDate);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < availableDates.length - 1;

  const goTo = (date: string) => router.push(`/${channelId}/${date}`);

  return (
    <div className="flex items-center justify-between py-6">
      <button
        onClick={() => hasPrev && goTo(availableDates[currentIdx - 1])}
        disabled={!hasPrev}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          enabled:hover:bg-channel-surface enabled:text-text
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">
          {hasPrev ? formatDate(availableDates[currentIdx - 1]) : "更早"}
        </span>
      </button>

      <div className="flex items-center gap-2 sm:gap-3">
        <Calendar className="w-5 h-5 text-channel-primary hidden sm:block" />
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold tracking-tight">
            {formatDate(currentDate)}
          </div>
          <div className="text-xs sm:text-sm text-text-secondary">
            {formatWeekday(currentDate)} · {currentDate}
          </div>
        </div>
      </div>

      <button
        onClick={() => hasNext && goTo(availableDates[currentIdx + 1])}
        disabled={!hasNext}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          enabled:hover:bg-channel-surface enabled:text-text
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <span className="hidden sm:inline">
          {hasNext ? formatDate(availableDates[currentIdx + 1]) : "更近"}
        </span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
