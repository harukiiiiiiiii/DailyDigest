"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChannelConfig } from "@/lib/types";
import { getIcon } from "@/lib/icons";

interface ChannelTabsProps {
  channels: ChannelConfig[];
  currentDate: string;
}

export default function ChannelTabs({
  channels,
  currentDate,
}: ChannelTabsProps) {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex gap-1 overflow-x-auto scrollbar-thin py-1 -mb-px">
          {channels.map((ch) => {
            const Icon = getIcon(ch.icon);
            const isActive = pathname.startsWith(`/${ch.id}`);

            return (
              <Link
                key={ch.id}
                href={`/${ch.id}/${currentDate}`}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-all duration-200
                  ${
                    isActive
                      ? "border-channel-primary text-channel-primary"
                      : "border-transparent text-text-secondary hover:text-text hover:border-border"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{ch.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
