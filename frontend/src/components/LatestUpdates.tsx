import Image from "next/image";
import Link from "next/link";
import type { LatestUpdate } from "@/lib/data";
import { formatTimeAgo } from "@/lib/data";

interface LatestUpdatesProps {
  updates: LatestUpdate[];
}

function truncateWords(text: string, wordCount: number): string {
  const words = text.split(" ");
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(" ") + "...";
}

export default function LatestUpdates({ updates }: LatestUpdatesProps) {
  return (
    <section className="py-6">
      <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Latest Updates</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {updates.map((update, index) => (
          <Link
            key={`${update.mangaId}-${update.chapterNumber}-${index}`}
            href={`/manga/${update.mangaSlug}/chapter/${update.chapterNumber}`}
            className="flex gap-4 p-4 bg-[#242424] hover:bg-[#2d2d2d] transition-colors group"
          >
            <div className="relative w-20 h-28 flex-shrink-0 overflow-hidden bg-[#2d2d2d]">
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
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-base font-semibold text-[#e5e5e5] truncate group-hover:text-[#ff6740] transition-colors">
                {update.mangaTitle}
              </h3>
              <p className="text-sm text-[#a3a3a3] mb-2">
                Chapter {update.chapterNumber} - {formatTimeAgo(update.updatedAt)}
              </p>
              <p className="text-xs text-[#737373] line-clamp-3 leading-relaxed">
                {truncateWords(update.description || "", 50)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
