export interface Manga {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  status: "ongoing" | "completed" | "hiatus";
  genres: string[];
  author: string;
  artist: string;
  year: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  pages: number;
  createdAt: Date;
}

export interface LatestUpdate {
  mangaId: string;
  mangaSlug: string;
  mangaTitle: string;
  coverImage: string;
  chapterNumber: number;
  chapterTitle: string;
  updatedAt: Date;
}

const mangaList: Manga[] = [
  {
    id: "1",
    slug: "demon-blade-chronicles",
    title: "Demon Blade Chronicles",
    description:
      "In a world where demons roam freely, one young swordsman discovers an ancient blade that grants him unimaginable power—but at a terrible cost. Follow Ryuki as he battles both external demons and the darkness within, seeking to protect those he loves while unraveling the mystery of his cursed weapon.",
    coverImage: "https://picsum.photos/300/450?random=1",
    status: "ongoing",
    genres: ["Action", "Fantasy", "Supernatural"],
    author: "Takeshi Yamamoto",
    artist: "Takeshi Yamamoto",
    year: 2021,
    chapters: Array.from({ length: 127 }, (_, i) => ({
      id: `1-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "The Awakening" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 10) + 18,
      createdAt: new Date(Date.now() - (127 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "2",
    slug: "moonlit-academy",
    title: "Moonlit Academy",
    description:
      "When ordinary high school student Hana receives a mysterious invitation to attend the prestigious Moonlit Academy, she discovers a hidden world of magic, supernatural beings, and ancient rivalries. As she learns to harness her latent powers, she must navigate complex relationships and uncover the truth about her own heritage.",
    coverImage: "https://picsum.photos/300/450?random=2",
    status: "ongoing",
    genres: ["Fantasy", "Romance", "School Life"],
    author: "Sakura Mizuki",
    artist: "Yuki Tanaka",
    year: 2022,
    chapters: Array.from({ length: 89 }, (_, i) => ({
      id: `2-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "The Invitation" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 8) + 20,
      createdAt: new Date(Date.now() - (89 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "3",
    slug: "steel-fist-revolution",
    title: "Steel Fist Revolution",
    description:
      "In a dystopian future where corporations rule with iron fists, underground fighter Jin leads a rebellion against the oppressive regime. With his cybernetic enhancements and unbreakable will, he fights for freedom in brutal arena battles while building an army of resistance fighters.",
    coverImage: "https://picsum.photos/300/450?random=3",
    status: "ongoing",
    genres: ["Action", "Sci-Fi", "Drama"],
    author: "Kenji Nakamura",
    artist: "Kenji Nakamura",
    year: 2020,
    chapters: Array.from({ length: 156 }, (_, i) => ({
      id: `3-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "Underground" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 6) + 22,
      createdAt: new Date(Date.now() - (156 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "4",
    slug: "culinary-battle-royale",
    title: "Culinary Battle Royale",
    description:
      "Aspiring chef Yuto enters the most prestigious cooking competition in Japan, where young culinary geniuses battle for supremacy. Each dish tells a story, and every competition pushes the boundaries of gastronomy. Can Yuto's humble home cooking style triumph over elite academy-trained rivals?",
    coverImage: "https://picsum.photos/300/450?random=4",
    status: "completed",
    genres: ["Comedy", "Slice of Life", "Drama"],
    author: "Megumi Sato",
    artist: "Haruki Ito",
    year: 2019,
    chapters: Array.from({ length: 215 }, (_, i) => ({
      id: `4-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "First Course" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 8) + 18,
      createdAt: new Date(Date.now() - (215 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "5",
    slug: "phantom-detective",
    title: "Phantom Detective",
    description:
      "Detective Shinji Kudo can see ghosts—a gift that makes him invaluable in solving the most mysterious cases. But when a serial killer begins targeting spirits themselves, Shinji must delve into the supernatural underworld to stop a threat that endangers both the living and the dead.",
    coverImage: "https://picsum.photos/300/450?random=5",
    status: "ongoing",
    genres: ["Mystery", "Supernatural", "Thriller"],
    author: "Rei Yoshida",
    artist: "Rei Yoshida",
    year: 2023,
    chapters: Array.from({ length: 45 }, (_, i) => ({
      id: `5-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "The Gift" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 10) + 24,
      createdAt: new Date(Date.now() - (45 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "6",
    slug: "dragon-emperor-rising",
    title: "Dragon Emperor Rising",
    description:
      "Cast out from his noble family and left for dead, young prince Kaito bonds with the last dragon egg in existence. Together with his dragon companion, he must reclaim his throne and unite a fractured kingdom against an ancient evil awakening in the north.",
    coverImage: "https://picsum.photos/300/450?random=6",
    status: "ongoing",
    genres: ["Fantasy", "Action", "Adventure"],
    author: "Hiroshi Ogawa",
    artist: "Mika Fujimoto",
    year: 2022,
    chapters: Array.from({ length: 78 }, (_, i) => ({
      id: `6-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "Exile" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 8) + 20,
      createdAt: new Date(Date.now() - (78 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "7",
    slug: "heartstrings",
    title: "Heartstrings",
    description:
      "Two musicians from completely different worlds—classical violinist Aoi and street guitarist Ren—meet by chance and discover an undeniable musical chemistry. As they collaborate on a competition piece, they must confront their own dreams, family expectations, and growing feelings for each other.",
    coverImage: "https://picsum.photos/300/450?random=7",
    status: "ongoing",
    genres: ["Romance", "Music", "Drama"],
    author: "Yui Hayashi",
    artist: "Yui Hayashi",
    year: 2023,
    chapters: Array.from({ length: 34 }, (_, i) => ({
      id: `7-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "Chance Encounter" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 6) + 22,
      createdAt: new Date(Date.now() - (34 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "8",
    slug: "void-hunters",
    title: "Void Hunters",
    description:
      "When rifts to other dimensions begin appearing across the world, a specialized unit of hunters is formed to combat the creatures emerging from the void. Rookie hunter Akira must prove herself among legendary veterans while uncovering a conspiracy that threatens reality itself.",
    coverImage: "https://picsum.photos/300/450?random=8",
    status: "ongoing",
    genres: ["Action", "Sci-Fi", "Horror"],
    author: "Taro Kimura",
    artist: "Taro Kimura",
    year: 2021,
    chapters: Array.from({ length: 112 }, (_, i) => ({
      id: `8-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "First Rift" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 8) + 20,
      createdAt: new Date(Date.now() - (112 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "9",
    slug: "immortal-gambit",
    title: "Immortal Gambit",
    description:
      "For centuries, immortal beings have played a deadly game for ultimate power. When mortal chess prodigy Shiro accidentally becomes a piece in this ancient contest, he must use his strategic genius to survive against beings who have played for millennia.",
    coverImage: "https://picsum.photos/300/450?random=9",
    status: "hiatus",
    genres: ["Fantasy", "Psychological", "Thriller"],
    author: "Naomi Watanabe",
    artist: "Jun Matsuda",
    year: 2020,
    chapters: Array.from({ length: 67 }, (_, i) => ({
      id: `9-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "The Board" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 10) + 26,
      createdAt: new Date(Date.now() - (67 - i) * 14 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "10",
    slug: "kitchen-witch",
    title: "Kitchen Witch",
    description:
      "Mio runs a cozy café where every dish is infused with a little magic. Whether it's healing heartbreak, boosting confidence, or bringing luck, her enchanted recipes help customers with their everyday troubles. A heartwarming slice-of-life about food, magic, and human connection.",
    coverImage: "https://picsum.photos/300/450?random=10",
    status: "ongoing",
    genres: ["Slice of Life", "Fantasy", "Comedy"],
    author: "Hana Kobayashi",
    artist: "Hana Kobayashi",
    year: 2023,
    chapters: Array.from({ length: 28 }, (_, i) => ({
      id: `10-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "Opening Day" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 6) + 18,
      createdAt: new Date(Date.now() - (28 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "11",
    slug: "shadow-monarch",
    title: "Shadow Monarch",
    description:
      "After dying in a dungeon raid, hunter Sung awakens with the unique ability to command shadows of the defeated. Starting from the weakest rank, he begins a meteoric rise through the hunter rankings, accumulating an ever-growing army of shadow soldiers.",
    coverImage: "https://picsum.photos/300/450?random=11",
    status: "completed",
    genres: ["Action", "Fantasy", "Adventure"],
    author: "Chugong",
    artist: "Dubu",
    year: 2018,
    chapters: Array.from({ length: 179 }, (_, i) => ({
      id: `11-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "Reawakening" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 10) + 22,
      createdAt: new Date(Date.now() - (179 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
  {
    id: "12",
    slug: "samurai-champloo-roads",
    title: "Samurai Champloo Roads",
    description:
      "In Edo-era Japan, three unlikely companions—a ronin with a mysterious past, a wild hip-hop inspired swordsman, and a determined young woman—travel together searching for 'the samurai who smells of sunflowers.' Their journey is filled with action, humor, and unexpected bonds.",
    coverImage: "https://picsum.photos/300/450?random=12",
    status: "ongoing",
    genres: ["Action", "Historical", "Comedy"],
    author: "Shinichiro Watanabe",
    artist: "Kazuto Nakazawa",
    year: 2022,
    chapters: Array.from({ length: 56 }, (_, i) => ({
      id: `12-${i + 1}`,
      number: i + 1,
      title: i === 0 ? "Tempestuous Temperaments" : `Chapter ${i + 1}`,
      pages: Math.floor(Math.random() * 8) + 20,
      createdAt: new Date(Date.now() - (56 - i) * 7 * 24 * 60 * 60 * 1000),
    })),
  },
];

export function getAllManga(): Manga[] {
  return mangaList;
}

export function getMangaBySlug(slug: string): Manga | undefined {
  return mangaList.find((manga) => manga.slug === slug);
}

export function getMangaById(id: string): Manga | undefined {
  return mangaList.find((manga) => manga.id === id);
}

export function getPopularManga(): Manga[] {
  return mangaList.slice(0, 8);
}

export function getLatestUpdates(): LatestUpdate[] {
  const updates: LatestUpdate[] = [];
  const timeOffsets = [
    2 * 60 * 60 * 1000, // 2 hours
    5 * 60 * 60 * 1000, // 5 hours
    8 * 60 * 60 * 1000, // 8 hours
    12 * 60 * 60 * 1000, // 12 hours
    18 * 60 * 60 * 1000, // 18 hours
    24 * 60 * 60 * 1000, // 1 day
    36 * 60 * 60 * 1000, // 1.5 days
    48 * 60 * 60 * 1000, // 2 days
    72 * 60 * 60 * 1000, // 3 days
    96 * 60 * 60 * 1000, // 4 days
    120 * 60 * 60 * 1000, // 5 days
    144 * 60 * 60 * 1000, // 6 days
    168 * 60 * 60 * 1000, // 7 days
    192 * 60 * 60 * 1000, // 8 days
    240 * 60 * 60 * 1000, // 10 days
  ];

  mangaList.forEach((manga, index) => {
    const latestChapter = manga.chapters[manga.chapters.length - 1];
    if (latestChapter) {
      updates.push({
        mangaId: manga.id,
        mangaSlug: manga.slug,
        mangaTitle: manga.title,
        coverImage: manga.coverImage,
        chapterNumber: latestChapter.number,
        chapterTitle: latestChapter.title,
        updatedAt: new Date(Date.now() - timeOffsets[index % timeOffsets.length]),
      });
    }
  });

  return updates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getChapterPages(mangaSlug: string, chapterNum: number): string[] {
  const manga = getMangaBySlug(mangaSlug);
  if (!manga) return [];

  const chapter = manga.chapters.find((c) => c.number === chapterNum);
  if (!chapter) return [];

  return Array.from(
    { length: chapter.pages },
    (_, i) => `https://picsum.photos/800/1200?random=${mangaSlug}-${chapterNum}-${i + 1}`
  );
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
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
    return date.toLocaleDateString();
  }
}
