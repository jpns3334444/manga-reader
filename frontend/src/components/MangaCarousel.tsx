"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Manga } from "@/lib/data";

interface MangaCarouselProps {
  title: string;
  manga: Manga[];
}

export default function MangaCarousel({ title, manga }: MangaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#e5e5e5]">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="p-2 rounded-lg bg-[#2d2d2d] hover:bg-[#363636] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Scroll left"
          >
            <svg
              className="w-5 h-5 text-[#e5e5e5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="p-2 rounded-lg bg-[#2d2d2d] hover:bg-[#363636] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Scroll right"
          >
            <svg
              className="w-5 h-5 text-[#e5e5e5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto hide-scrollbar pb-2"
      >
        {manga.map((m) => (
          <Link
            key={m.id}
            href={`/manga/${m.slug}`}
            className="flex-shrink-0 w-[160px] group"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#2d2d2d]">
              <Image
                src={m.coverImage}
                alt={m.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="160px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-[#e5e5e5] line-clamp-2 group-hover:text-[#ff6740] transition-colors">
              {m.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
