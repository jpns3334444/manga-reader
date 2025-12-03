"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface MangaTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string | null;
  genres: string[];
  coverImage: string | null;
}

export default function MangaTooltip({
  children,
  title,
  description,
  genres,
  coverImage,
}: MangaTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const tooltipWidth = 540;
    const tooltipHeight = 300;
    const padding = 16;

    let x = e.clientX + padding;
    let y = e.clientY + padding;

    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - padding;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - padding;
    }

    initialPosRef.current = { x, y };

    timeoutRef.current = setTimeout(() => {
      if (initialPosRef.current) {
        setPosition(initialPosRef.current);
        setIsVisible(true);
      }
    }, 500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    initialPosRef.current = null;

    // Delay hiding to allow mouse to move to tooltip
    setTimeout(() => {
      if (!isHoveringTooltip) {
        setIsVisible(false);
      }
    }, 50);
  };

  const handleTooltipMouseEnter = () => {
    setIsHoveringTooltip(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsHoveringTooltip(false);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="contents"
    >
      {children}

      {isVisible && (
        <div
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className="fixed z-[100] w-[546px] bg-[#242424]/95 backdrop-blur-sm shadow-2xl p-6"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <div className="flex gap-6">
            <div className="relative w-[160px] h-[240px] flex-shrink-0 overflow-hidden bg-[#2d2d2d]">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#737373] text-xs">
                  No Cover
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[#e5e5e5] text-lg leading-tight mb-2">
                {title}
              </h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="px-2.5 py-1 text-sm text-[#a3a3a3] bg-[#1a1a1a]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <p className="text-base text-[#a3a3a3] line-clamp-7 leading-relaxed">
                {description || "No description available."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
