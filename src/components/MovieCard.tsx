import React, { useState } from "react";
import { Play, Plus, Check, Info, Star } from "lucide-react";
import { motion } from "motion/react";
import { MediaItem } from "../types";

interface MovieCardProps {
  key?: React.Key;
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (item: MediaItem) => void;
}

export default function MovieCard({
  item,
  onSelect,
  onPlay,
  isInWatchlist,
  onToggleWatchlist,
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const title = item.title || item.name || "Untitled";
  const releaseDate = item.release_date || item.first_air_date || "";
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : "";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");

  // Calculate matching percentage
  const matchPercentage = item.vote_average 
    ? Math.min(100, Math.round(item.vote_average * 10 + 15)) 
    : 85;

  // TMDB Poster Image URL
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=500&auto=format&fit=crop";

  return (
    <motion.div
      id={`movie-card-${item.id}`}
      tabIndex={0}
      onClick={() => onSelect(item)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative flex-none w-44 sm:w-48 md:w-56 h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden group cursor-pointer bg-[#0e0f14] border border-white/[0.08] transition-all duration-300 shadow-xl tv-focusable"
      whileHover={{
        y: -6,
        scale: 1.02,
        borderColor: "rgba(229, 9, 20, 0.6)",
        boxShadow: "0 20px 35px -10px rgba(0,0,0,0.9), 0 0 20px rgba(229, 9, 20, 0.25)",
      }}
    >
      {/* Poster Image */}
      <img
        src={posterUrl}
        alt={title}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Subtle Bottom & Top Ambient Shadow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-[#07080b]/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

      {/* Static Floating Metadata (Top Right Rating - Unboxed with glass backdrop) */}
      {rating && (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/[0.08]">
          <Star className="w-3 h-3 fill-amber-400 stroke-none" />
          <span>{rating}</span>
        </div>
      )}

      {/* Media Type Indicator (Quiet text kicker on top left) */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <span className="text-[10px] font-bold tracking-wider text-neutral-300 uppercase bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/[0.08]">
          {mediaType === "tv" ? "TV Show" : "Movie"}
        </span>
      </div>

      {/* Bottom Title Preview (Visible at rest) */}
      <div className={`absolute inset-x-0 bottom-0 p-4 transition-opacity duration-200 ${isHovered ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <h4 className="font-display text-sm font-bold text-white line-clamp-1 tracking-tight leading-snug">
          {title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
          {releaseYear && <span>{releaseYear}</span>}
          {releaseYear && <span aria-hidden="true">·</span>}
          <span className="text-emerald-400 font-semibold">{matchPercentage}% Match</span>
        </div>
      </div>

      {/* Hover State: Rich Actions & Detailed Meta */}
      <div
        className={`absolute inset-0 flex flex-col justify-end p-4 transition-all duration-200 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/95 to-black/30 ${
          isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <h4 className="font-display text-base font-bold text-white line-clamp-2 leading-tight mb-1">
          {title}
        </h4>

        {/* Clean Unboxed Metadata with Typographic Separators */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-300 mb-3.5 font-medium">
          <span className="text-emerald-400 font-bold">{matchPercentage}% Match</span>
          {releaseYear && (
            <>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{releaseYear}</span>
            </>
          )}
          {rating && (
            <>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="flex items-center gap-1 text-amber-300">
                <Star className="w-3 h-3 fill-amber-400 stroke-none" />
                {rating}
              </span>
            </>
          )}
        </div>

        {/* Action Controls Strip */}
        <div id={`card-actions-${item.id}`} className="flex items-center gap-2">
          {/* Main Watch Button */}
          <button
            id={`btn-play-card-${item.id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#e50914] hover:bg-[#b80710] text-white text-xs font-bold py-2 px-3 rounded-xl transition-all duration-150 shadow-md cursor-pointer uppercase tracking-wider h-9"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch</span>
          </button>

          {/* Watchlist Toggle Button */}
          <button
            id={`btn-watchlist-card-${item.id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item);
            }}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-150 cursor-pointer ${
              isInWatchlist
                ? "bg-[#e50914] text-white border-[#e50914] hover:bg-[#b80710]"
                : "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border-white/[0.12] hover:border-white/[0.3]"
            }`}
            title={isInWatchlist ? "Remove from List" : "Add to My List"}
          >
            {isInWatchlist ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>

          {/* Details Button */}
          <button
            id={`btn-info-card-${item.id}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="More Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
