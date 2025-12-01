import MangaCarousel from "@/components/MangaCarousel";
import LatestUpdates from "@/components/LatestUpdates";
import { getPopularManga, getLatestUpdates } from "@/lib/data";

export default function Home() {
  const popularManga = getPopularManga();
  const latestUpdates = getLatestUpdates();

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <MangaCarousel title="Most Popular" manga={popularManga} />
      <LatestUpdates updates={latestUpdates} />
    </main>
  );
}
