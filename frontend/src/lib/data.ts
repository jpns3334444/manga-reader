// Type definitions for manga reader
// Data fetching functions are in api.ts

export interface Manga {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  status: "ongoing" | "completed" | "hiatus" | "cancelled";
  genres: string[];
  author: string | null;
  artist: string | null;
  year: number | null;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string | null;
  pages: number;
  createdAt: Date;
}

export interface LatestUpdate {
  mangaId: string;
  mangaSlug: string;
  mangaTitle: string;
  description: string | null;
  genres: string[];
  coverImage: string | null;
  chapterNumber: number;
  chapterTitle: string | null;
  updatedAt: Date;
}

export interface ChapterDetail {
  id: string;
  mangaId: string;
  mangaTitle: string;
  mangaSlug: string;
  chapterNumber: number;
  title: string | null;
  pageCount: number;
  createdAt: Date;
  prevChapter: number | null;
  nextChapter: number | null;
  pages: {
    id: string;
    pageNumber: number;
    imageUrl: string;
  }[];
}

// Utility functions
export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  } else {
    return dateObj.toLocaleDateString();
  }
}
