const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  if (!API_URL) {
    throw new Error("API_URL is not configured");
  }

  const response = await fetch(`${API_URL}${endpoint}`);

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.status}`);
  }

  return response.json();
}

// API response types
interface MangaResponse {
  manga: ApiManga[];
}

interface SingleMangaResponse {
  manga: ApiManga & { chapters: ApiChapter[] };
}

interface ChapterResponse {
  chapter: ApiChapterDetail;
}

interface LatestMangaResponse {
  manga: (ApiManga & {
    latest_chapter_number: number | null;
    latest_chapter_title: string | null;
    latest_chapter_date: string | null;
  })[];
}

// API types (snake_case from backend)
export interface ApiManga {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  status: "ongoing" | "completed" | "hiatus" | "cancelled";
  genres: string[];
  author: string | null;
  artist: string | null;
  year: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiChapter {
  id: string;
  manga_id: string;
  chapter_number: string;
  title: string | null;
  page_count: number;
  created_at: string;
}

export interface ApiChapterDetail extends ApiChapter {
  manga_title: string;
  manga_slug: string;
  prev_chapter: number | null;
  next_chapter: number | null;
  pages: {
    id: string;
    page_number: number;
    image_key: string;
    image_url: string;
  }[];
}

// Fetch functions
export async function getMangaList(): Promise<ApiManga[]> {
  try {
    const data = await fetchApi<MangaResponse>("/manga");
    return data.manga;
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
}

export async function getAllMangaSlugs(): Promise<string[]> {
  const manga = await getMangaList();
  return manga.map((m) => m.slug);
}

export async function getAllChapterParams(): Promise<
  { slug: string; num: string }[]
> {
  try {
    const manga = await getMangaList();
    const params: { slug: string; num: string }[] = [];

    for (const m of manga) {
      const mangaData = await getMangaBySlug(m.slug);
      if (mangaData?.chapters) {
        for (const ch of mangaData.chapters) {
          params.push({ slug: m.slug, num: ch.chapter_number });
        }
      }
    }

    return params;
  } catch {
    return [];
  }
}

export async function getPopularManga(): Promise<ApiManga[]> {
  try {
    const data = await fetchApi<MangaResponse>("/manga?popular=true");
    return data.manga;
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
}

export async function getLatestUpdates(): Promise<LatestMangaResponse["manga"]> {
  try {
    const data = await fetchApi<LatestMangaResponse>("/manga/latest");
    return data.manga;
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }
    throw error;
  }
}

export async function getMangaBySlug(
  slug: string
): Promise<(ApiManga & { chapters: ApiChapter[] }) | null> {
  try {
    const data = await fetchApi<SingleMangaResponse>(`/manga/slug/${slug}`);
    return data.manga;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getChapter(
  slug: string,
  chapterNumber: number
): Promise<ApiChapterDetail | null> {
  try {
    const data = await fetchApi<ChapterResponse>(
      `/manga/slug/${slug}/chapter/${chapterNumber}`
    );
    return data.chapter;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
