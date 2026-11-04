import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "../types";
import MovieCard from "./MovieCard";

interface MovieCarouselProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  watchlist: number[];
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

export default function MovieCarousel({
  title,
  subtitle,
  items,
  watchlist,
  onSelect,
  onPlay,
  onToggleWatchlist,
}: MovieCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScrollState = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setShowLeftArrow(el.scrollLeft > 10);
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollState, { passive: true });
      checkScrollState();
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", checkScrollState);
      }
    };
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  const safeId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="relative my-10 px-4 md:px-12 group/carousel">
      {/* Row Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="font-display text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-normal text-neutral-500 font-sans">
              ({items.length})
            </span>
          </h3>
          {subtitle && (
            <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Carousel Wrapper */}
      <div className="relative">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            id={`carousel-left-${safeId}`}
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 bg-black/80 hover:bg-[#e50914] text-white rounded-full border border-white/[0.1] hover:border-[#e50914] transition-all duration-200 opacity-0 group-hover/carousel:opacity-100 hover:scale-110 shadow-2xl backdrop-blur-md cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            id={`carousel-right-${safeId}`}
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 bg-black/80 hover:bg-[#e50914] text-white rounded-full border border-white/[0.1] hover:border-[#e50914] transition-all duration-200 opacity-0 group-hover/carousel:opacity-100 hover:scale-110 shadow-2xl backdrop-blur-md cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden pb-4 pt-1 snap-x scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start shrink-0">
              <MovieCard
                item={item}
                onSelect={onSelect}
                onPlay={onPlay}
                isInWatchlist={watchlist.includes(item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
