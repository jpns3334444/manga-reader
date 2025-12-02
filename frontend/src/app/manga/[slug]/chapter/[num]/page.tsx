"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getMangaBySlug, getChapterPages } from "@/lib/data";

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const chapterNum = parseInt(params.num as string, 10);

  const manga = getMangaBySlug(slug);
  const pages = getChapterPages(slug, chapterNum);

  const chapter = manga?.chapters.find((c) => c.number === chapterNum);
  const prevChapter = manga?.chapters.find((c) => c.number === chapterNum - 1);
  const nextChapter = manga?.chapters.find((c) => c.number === chapterNum + 1);

  const goToPrev = useCallback(() => {
    if (prevChapter) {
      router.push(`/manga/${slug}/chapter/${prevChapter.number}`);
    }
  }, [prevChapter, router, slug]);

  const goToNext = useCallback(() => {
    if (nextChapter) {
      router.push(`/manga/${slug}/chapter/${nextChapter.number}`);
    }
  }, [nextChapter, router, slug]);

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

  if (!manga || !chapter) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-[#e5e5e5]">
            Chapter not found
          </h1>
          <Link href="/" className="text-[#ff6740] hover:underline mt-4 block">
            Return to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d]">
      {/* Top navigation */}
      <div className="sticky top-14 z-40 bg-[#1a1a1a] border-b border-[#404040]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/manga/${slug}`}
            className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
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
            <span className="hidden sm:inline">{manga.title}</span>
          </Link>

          <span className="text-[#e5e5e5] font-medium">
            Chapter {chapterNum}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrev}
              disabled={!prevChapter}
              className="p-2 bg-[#2d2d2d] hover:bg-[#363636] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous chapter"
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
              onClick={goToNext}
              disabled={!nextChapter}
              className="p-2 bg-[#2d2d2d] hover:bg-[#363636] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next chapter"
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
      </div>

      {/* Pages */}
      <div className="max-w-4xl mx-auto py-4">
        {pages.map((pageUrl, index) => (
          <div key={index} className="mb-1">
            <Image
              src={pageUrl}
              alt={`Page ${index + 1}`}
              width={800}
              height={1200}
              className="w-full h-auto"
              priority={index < 3}
            />
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="bg-[#1a1a1a] border-t border-[#404040]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {prevChapter ? (
            <Link
              href={`/manga/${slug}/chapter/${prevChapter.number}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] hover:bg-[#363636] text-[#e5e5e5] transition-colors"
            >
              <svg
                className="w-5 h-5"
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
              Previous
            </Link>
          ) : (
            <div />
          )}

          <Link
            href={`/manga/${slug}`}
            className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
          >
            Back to {manga.title}
          </Link>

          {nextChapter ? (
            <Link
              href={`/manga/${slug}/chapter/${nextChapter.number}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d2d2d] hover:bg-[#363636] text-[#e5e5e5] transition-colors"
            >
              Next
              <svg
                className="w-5 h-5"
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
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="fixed bottom-4 right-4 text-xs text-[#737373] bg-[#242424] px-3 py-2 opacity-75">
        Use ← → arrow keys to navigate
      </div>
    </main>
  );
}
