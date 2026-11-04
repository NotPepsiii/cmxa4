import { useEffect, useRef } from "react";
import { X, Play, Clock, Star, Calendar, Bookmark, Film, ExternalLink, Check } from "lucide-react";
import { MediaItem } from "../types";

interface DetailModalProps {
  item: MediaItem;
  onClose: () => void;
  onPlay: (item: MediaItem) => void;
  watchlist: number[];
  onToggleWatchlist: (item: MediaItem) => void;
  onSelectSimilar: (item: MediaItem) => void;
}

export default function DetailModal({
  item,
  onClose,
  onPlay,
  watchlist,
  onToggleWatchlist,
  onSelectSimilar,
}: DetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      playButtonRef.current?.focus();
    }, 100);
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const title = item.title || item.name || "Untitled";
  const releaseDate = item.release_date || item.first_air_date || "";
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : "";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const mediaType = item.first_air_date ? "tv" : "movie";
  const isInWatchlist = watchlist.includes(item.id);

  const matchPercentage = item.vote_average 
    ? Math.min(100, Math.round(item.vote_average * 10 + 15)) 
    : 85;

  const backdropUrl = item.backdrop_path
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
    : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop";

  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=500&auto=format&fit=crop";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div
        ref={modalRef}
        id="detail-modal-container"
        className="relative bg-[#0b0c10] text-white rounded-3xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/[0.1] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Backdrop Banner */}
        <div className="relative aspect-[16/9] w-full max-h-[360px] overflow-hidden">
          <img
            src={backdropUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle Multi-Stop Ambient Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/50 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0b0c10]/80 to-transparent hidden md:block" />

          {/* Close Button */}
          <button
            id="btn-close-modal-upper"
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/60 hover:bg-[#e50914] text-white p-2.5 rounded-full transition-all duration-200 z-20 shadow-xl border border-white/[0.15] cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 md:px-10 pb-10 relative z-10 -mt-16 sm:-mt-24">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Poster thumbnail */}
            <div className="w-28 sm:w-36 shrink-0 rounded-2xl overflow-hidden border border-white/[0.15] shadow-2xl bg-neutral-900 hidden sm:block">
              <img
                src={posterUrl}
                alt={title}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>

            {/* Info Column */}
            <div className="flex-1 text-left min-w-0">
              {/* Unboxed Metadata Line */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300 font-semibold mb-2">
                <span className="text-emerald-400 font-bold">{matchPercentage}% Match</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-white uppercase tracking-wider text-[11px] font-bold">
                  {mediaType === "tv" ? "TV Series" : "Movie"}
                </span>
                {releaseYear && (
                  <>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span>{releaseYear}</span>
                  </>
                )}
                {rating && (
                  <>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                      {rating}
                    </span>
                  </>
                )}
                {mediaType === "movie" && item.runtime && (
                  <>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span>{item.runtime}m</span>
                  </>
                )}
                {mediaType === "tv" && item.number_of_seasons && (
                  <>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span>{item.number_of_seasons} Season{item.number_of_seasons > 1 ? "s" : ""}</span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2 font-display">
                {title}
              </h1>

              {item.tagline && (
                <p className="text-xs sm:text-sm text-neutral-400 italic mb-4 leading-relaxed">
                  &ldquo;{item.tagline}&rdquo;
                </p>
              )}

              {/* Action Buttons */}
              <div id="modal-actions-panel" className="flex flex-wrap items-center gap-3 mb-6 mt-4">
                <button
                  id="btn-play-modal"
                  ref={playButtonRef}
                  onClick={() => {
                    onPlay(item);
                    onClose();
                  }}
                  className="flex items-center gap-2 bg-[#e50914] hover:bg-[#b80710] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-950/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </button>

                <button
                  id="btn-watchlist-modal"
                  onClick={() => onToggleWatchlist(item)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    isInWatchlist
                      ? "bg-[#e50914] border-[#e50914] text-white shadow-md shadow-red-950/30"
                      : "bg-white/[0.05] border-white/[0.1] hover:border-white/[0.25] text-neutral-200 hover:text-white"
                  }`}
                >
                  {isInWatchlist ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>In My List</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Add to List</span>
                    </>
                  )}
                </button>

                {item.external_ids?.imdb_id && (
                  <a
                    id="link-imdb-external"
                    href={`https://www.imdb.com/title/${item.external_ids.imdb_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-amber-500/40 text-amber-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    <span>IMDb</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Overview */}
              <div className="mb-6">
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl font-normal">
                  {item.overview || "No overview available for this title."}
                </p>
              </div>
            </div>
          </div>

          {/* Cast */}
          {item.credits && item.credits.cast && item.credits.cast.length > 0 && (
            <div className="mt-8 border-t border-white/[0.08] pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">
                Featured Cast
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-3 pr-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {item.credits.cast.slice(0, 8).map((actor) => {
                  const actorImage = actor.profile_path
                    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop";
                  
                  return (
                    <div key={actor.id} className="flex-none w-20 text-center group">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto border border-white/[0.1] group-hover:border-[#e50914] transition-colors bg-neutral-900 shadow-md">
                        <img
                          src={actorImage}
                          alt={actor.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h4 className="text-neutral-200 text-[11px] font-semibold mt-2 truncate font-sans">
                        {actor.name}
                      </h4>
                      <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                        {actor.character || "Actor"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Similar Recommendations */}
          {item.similar && item.similar.results && item.similar.results.length > 0 && (
            <div className="mt-8 border-t border-white/[0.08] pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4 font-display">
                More Like This
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {item.similar.results.slice(0, 8).map((similarItem) => {
                  const sTitle = similarItem.title || similarItem.name || "Untitled";
                  const sYear = (similarItem.release_date || similarItem.first_air_date || "").substring(0, 4);
                  const sPoster = similarItem.poster_path
                    ? `https://image.tmdb.org/t/p/w300${similarItem.poster_path}`
                    : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=300&auto=format&fit=crop";

                  return (
                    <button
                      key={similarItem.id}
                      id={`btn-similar-${similarItem.id}`}
                      onClick={() => onSelectSimilar(similarItem)}
                      className="flex-none w-24 text-left group cursor-pointer"
                    >
                      <div className="w-24 aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.08] group-hover:border-[#e50914] transition-all bg-neutral-950 shadow-md">
                        <img
                          src={sPoster}
                          alt={sTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h4 className="text-[11px] font-semibold text-neutral-200 truncate mt-2 group-hover:text-[#e50914] transition-colors leading-tight font-display">
                        {sTitle}
                      </h4>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        {sYear || "2026"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
