"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ChapterNavigationProps {
  mangaSlug: string;
  prevChapter: number | null;
  nextChapter: number | null;
}

export default function ChapterNavigation({
  mangaSlug,
  prevChapter,
  nextChapter,
}: ChapterNavigationProps) {
  const router = useRouter();

  const goToPrev = useCallback(() => {
    if (prevChapter !== null) {
      router.push(`/manga/${mangaSlug}/chapter/${prevChapter}`);
    }
  }, [prevChapter, router, mangaSlug]);

  const goToNext = useCallback(() => {
    if (nextChapter !== null) {
      router.push(`/manga/${mangaSlug}/chapter/${nextChapter}`);
    }
  }, [nextChapter, router, mangaSlug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  return null;
}
