import MangaCarousel from "@/components/MangaCarousel";
import LatestUpdates from "@/components/LatestUpdates";
import { getPopularManga, getLatestUpdates } from "@/lib/api";

export default async function Home() {
  const [popularMangaData, latestUpdatesData] = await Promise.all([
    getPopularManga(),
    getLatestUpdates(),
  ]);

  // Transform API data to component format
  const popularManga = popularMangaData.map((manga) => ({
    id: manga.id,
    slug: manga.slug,
    title: manga.title,
    description: manga.description || "",
    coverImage: manga.cover_image_url || "",
    status: manga.status as "ongoing" | "completed" | "hiatus",
    genres: manga.genres || [],
    author: manga.author || "",
    artist: manga.artist || "",
    year: manga.year || 0,
    chapters: [],
  }));

  const latestUpdates = latestUpdatesData.map((manga) => ({
    mangaId: manga.id,
    mangaSlug: manga.slug,
    mangaTitle: manga.title,
    description: manga.description || "",
    genres: manga.genres || [],
    coverImage: manga.cover_image_url || "",
    chapterNumber: manga.latest_chapter_number || 0,
    chapterTitle: manga.latest_chapter_title || "",
    updatedAt: new Date(manga.latest_chapter_date || manga.created_at),
  }));

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <MangaCarousel title="Most Popular" manga={popularManga} />
      <LatestUpdates updates={latestUpdates} />
    </main>
  );
}
