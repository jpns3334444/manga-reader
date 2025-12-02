import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMangaBySlug, formatTimeAgo } from "@/lib/data";

interface MangaPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MangaPage({ params }: MangaPageProps) {
  const { slug } = await params;
  const manga = getMangaBySlug(slug);

  if (!manga) {
    notFound();
  }

  const statusColors = {
    ongoing: "bg-green-600",
    completed: "bg-blue-600",
    hiatus: "bg-yellow-600",
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero section */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Cover */}
        <div className="flex-shrink-0 w-[200px] mx-auto md:mx-0">
          <div className="relative aspect-[2/3] overflow-hidden bg-[#2d2d2d]">
            <Image
              src={manga.coverImage}
              alt={manga.title}
              fill
              className="object-cover"
              sizes="200px"
              priority
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-[#e5e5e5] mb-2">
            {manga.title}
          </h1>

          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className={`px-2 py-1 text-xs font-medium text-white ${statusColors[manga.status]}`}
            >
              {manga.status.charAt(0).toUpperCase() + manga.status.slice(1)}
            </span>
            {manga.genres.map((genre) => (
              <span
                key={genre}
                className="px-2 py-1 text-xs font-medium text-[#a3a3a3] bg-[#2d2d2d]"
              >
                {genre}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-[#737373]">Author:</span>{" "}
              <span className="text-[#e5e5e5]">{manga.author}</span>
            </div>
            <div>
              <span className="text-[#737373]">Artist:</span>{" "}
              <span className="text-[#e5e5e5]">{manga.artist}</span>
            </div>
            <div>
              <span className="text-[#737373]">Year:</span>{" "}
              <span className="text-[#e5e5e5]">{manga.year}</span>
            </div>
            <div>
              <span className="text-[#737373]">Chapters:</span>{" "}
              <span className="text-[#e5e5e5]">{manga.chapters.length}</span>
            </div>
          </div>

          <p className="text-[#a3a3a3] leading-relaxed">{manga.description}</p>
        </div>
      </div>

      {/* Chapter list */}
      <section>
        <h2 className="text-xl font-bold text-[#e5e5e5] mb-4">Chapters</h2>
        <div className="bg-[#242424] overflow-hidden">
          {[...manga.chapters].reverse().map((chapter, index) => (
            <Link
              key={chapter.id}
              href={`/manga/${manga.slug}/chapter/${chapter.number}`}
              className={`flex items-center justify-between p-4 hover:bg-[#2d2d2d] transition-colors ${
                index !== 0 ? "border-t border-[#404040]" : ""
              }`}
            >
              <div>
                <span className="font-medium text-[#e5e5e5]">
                  Chapter {chapter.number}
                </span>
                {chapter.title !== `Chapter ${chapter.number}` && (
                  <span className="text-[#a3a3a3] ml-2">- {chapter.title}</span>
                )}
              </div>
              <span className="text-sm text-[#737373]">
                {formatTimeAgo(chapter.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
