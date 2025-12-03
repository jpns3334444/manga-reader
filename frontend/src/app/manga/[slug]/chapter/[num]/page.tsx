import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChapter } from "@/lib/api";
import ChapterNavigation from "@/components/ChapterNavigation";

interface ChapterPageProps {
  params: Promise<{ slug: string; num: string }>;
}

export default async function ChapterReaderPage({ params }: ChapterPageProps) {
  const { slug, num } = await params;
  const chapterNum = parseFloat(num);

  const chapter = await getChapter(slug, chapterNum);

  if (!chapter) {
    notFound();
  }

  const prevChapter = chapter.prev_chapter;
  const nextChapter = chapter.next_chapter;

  return (
    <main className="min-h-screen bg-[#0d0d0d]">
      {/* Keyboard navigation handler */}
      <ChapterNavigation
        mangaSlug={slug}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
      />

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
            <span className="hidden sm:inline">{chapter.manga_title}</span>
          </Link>

          <span className="text-[#e5e5e5] font-medium">
            Chapter {chapterNum}
          </span>

          <div className="flex items-center gap-2">
            {prevChapter !== null ? (
              <Link
                href={`/manga/${slug}/chapter/${prevChapter}`}
                className="p-2 bg-[#2d2d2d] hover:bg-[#363636] transition-colors"
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
              </Link>
            ) : (
              <div className="p-2 bg-[#2d2d2d] opacity-30 cursor-not-allowed">
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
              </div>
            )}
            {nextChapter !== null ? (
              <Link
                href={`/manga/${slug}/chapter/${nextChapter}`}
                className="p-2 bg-[#2d2d2d] hover:bg-[#363636] transition-colors"
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
              </Link>
            ) : (
              <div className="p-2 bg-[#2d2d2d] opacity-30 cursor-not-allowed">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pages */}
      <div className="max-w-4xl mx-auto py-4">
        {chapter.pages.length === 0 ? (
          <div className="text-center py-12 text-[#737373]">
            No pages available for this chapter
          </div>
        ) : (
          chapter.pages.map((page, index) => (
            <div key={page.id} className="mb-1">
              <Image
                src={page.image_url}
                alt={`Page ${page.page_number}`}
                width={800}
                height={1200}
                className="w-full h-auto"
                priority={index < 3}
              />
            </div>
          ))
        )}
      </div>

      {/* Bottom navigation */}
      <div className="bg-[#1a1a1a] border-t border-[#404040]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {prevChapter !== null ? (
            <Link
              href={`/manga/${slug}/chapter/${prevChapter}`}
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
            Back to {chapter.manga_title}
          </Link>

          {nextChapter !== null ? (
            <Link
              href={`/manga/${slug}/chapter/${nextChapter}`}
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
