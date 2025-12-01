import Image from "next/image";
import Link from "next/link";
import type { LatestUpdate } from "@/lib/data";
import { formatTimeAgo } from "@/lib/data";

interface LatestUpdatesProps {
  updates: LatestUpdate[];
}

export default function LatestUpdates({ updates }: LatestUpdatesProps) {
  return (
    <section className="py-6">
      <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Latest Updates</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {updates.map((update, index) => (
          <Link
            key={`${update.mangaId}-${update.chapterNumber}-${index}`}
            href={`/manga/${update.mangaSlug}/chapter/${update.chapterNumber}`}
            className="flex gap-3 p-3 rounded-lg bg-[#242424] hover:bg-[#2d2d2d] transition-colors group"
          >
            <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-[#2d2d2d]">
              <Image
                src={update.coverImage}
                alt={update.mangaTitle}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-[#e5e5e5] truncate group-hover:text-[#ff6740] transition-colors">
                {update.mangaTitle}
              </h3>
              <p className="text-sm text-[#a3a3a3]">
                Chapter {update.chapterNumber}
              </p>
              <p className="text-xs text-[#737373]">
                {formatTimeAgo(update.updatedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
