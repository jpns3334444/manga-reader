import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-[#404040]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg
            className="w-8 h-8 text-[#ff6740]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-xl font-bold text-[#e5e5e5]">MangaReader</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/"
            className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
          >
            Browse
          </Link>
        </nav>
      </div>
    </header>
  );
}
