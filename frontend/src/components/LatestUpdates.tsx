"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LatestUpdate } from "@/lib/data";

interface LatestUpdatesProps {
  updates: LatestUpdate[];
}

function truncateWords(text: string, wordCount: number): string {
  const words = text.split(" ");
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(" ") + "...";
}

function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return dateObj.toLocaleDateString();
  }
}

function TimeAgo({ date }: { date: Date | string }) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    setTimeAgo(formatTimeAgo(date));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(date));
    }, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return <>{timeAgo}</>;
}

export default function LatestUpdates({ updates }: LatestUpdatesProps) {
  return (
    <section className="py-6">
      <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Latest Updates</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {updates.map((update, index) => (
          <article
            key={`${update.mangaId}-${update.chapterNumber}-${index}`}
            className="flex gap-4 p-4 bg-[#242424] hover:bg-[#2d2d2d] transition-colors group"
          >
            <Link
              href={`/manga/${update.mangaSlug}`}
              className="relative w-20 h-28 flex-shrink-0 overflow-hidden bg-[#2d2d2d]"
            >
              {update.coverImage ? (
                <Image
                  src={update.coverImage}
                  alt={update.mangaTitle}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#737373] text-xs">
                  No Cover
                </div>
              )}
            </Link>

            <div className="flex-1 min-w-0 flex flex-col">
              <Link
                href={`/manga/${update.mangaSlug}`}
                className="text-base font-semibold text-[#e5e5e5] truncate hover:text-[#ff6740] transition-colors"
              >
                {update.mangaTitle}
              </Link>
              <p className="text-sm text-[#a3a3a3] mb-2">
                <Link
                  href={`/manga/${update.mangaSlug}/chapter/${update.chapterNumber}`}
                  className="hover:text-[#ff6740] transition-colors"
                >
                  Chapter {update.chapterNumber}
                </Link>
                {" - "}
                <TimeAgo date={update.updatedAt} />
              </p>
              <p className="text-xs text-[#737373] line-clamp-3 leading-relaxed">
                {truncateWords(update.description || "", 50)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
