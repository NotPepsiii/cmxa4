import React, { useState, useEffect } from "react";
import {
  X,
  ListVideo,
  Shield,
  ArrowRight,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { MediaItem, WatchHistoryItem } from "../types";
import { smartFetch } from "../api";

interface VideoPlayerProps {
  item: MediaItem;
  onClose: () => void;
  onUpdateHistory: (history: WatchHistoryItem) => void;
  initialSeason?: number;
  initialEpisode?: number;
}

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime?: number;
}

export default function VideoPlayer({
  item,
  onClose,
  onUpdateHistory,
  initialSeason,
  initialEpisode,
}: VideoPlayerProps) {
  const [currentSeason, setCurrentSeason] = useState<number>(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode || 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);

  // Playback timer & play next popup simulation
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPopupDismissed, setIsPopupDismissed] = useState<boolean>(false);

  // Pagination for episodes
  const [episodePage, setEpisodePage] = useState<number>(0);
  const episodesPerPage = 6;

  useEffect(() => {
    setEpisodePage(0);
  }, [currentSeason]);

  useEffect(() => {
    const epIndex = episodes.findIndex(e => e.episode_number === currentEpisode);
    if (epIndex !== -1) {
      setEpisodePage(Math.floor(epIndex / episodesPerPage));
    }
  }, [currentEpisode, episodes]);

  const currentEpisodeDetails = episodes.find(e => e.episode_number === currentEpisode);
  const runtimeMinutes = currentEpisodeDetails?.runtime || ((item as any).episode_run_time && (item as any).episode_run_time[0]) || item.runtime || 45;
  const duration = runtimeMinutes * 60;

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(true);
    setIsPopupDismissed(false);
  }, [currentEpisode, currentSeason]);
  
  const title = item.title || item.name || "Cinema Stream";
  const tmdbId = item.id;
  const isShow = item.first_air_date !== undefined;

  useEffect(() => {
    const historyItem: WatchHistoryItem = {
      mediaId: item.id,
      title: item.title || item.name || "Untitled",
      posterPath: item.poster_path,
      mediaType: isShow ? "tv" : "movie",
      timestamp: Date.now(),
      progressPercent: isShow 
        ? Math.round((currentEpisode / Math.max(1, item.number_of_episodes || 10)) * 100) 
        : 10,
      lastSeason: isShow ? currentSeason : undefined,
      lastEpisode: isShow ? currentEpisode : undefined,
    };
    onUpdateHistory(historyItem);
  }, [currentSeason, currentEpisode, item]);

  useEffect(() => {
    if (isShow) {
      fetchSeasonEpisodes(currentSeason);
    }
  }, [currentSeason, item]);

  const fetchSeasonEpisodes = async (seasonNum: number) => {
    setLoadingEpisodes(true);
    setEpisodeError(null);
    try {
      const response = await smartFetch(`/api/tv/${tmdbId}/season/${seasonNum}`);
      if (!response.ok) {
        throw new Error("Failed to load season episodes.");
      }
      const data = await response.json();
      setEpisodes(data.episodes || []);
    } catch (err: any) {
      console.error("Error fetching season episodes:", err);
      setEpisodeError("Failed to load episodes. Please verify connection.");
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const getEmbedUrl = () => {
    if (isShow) {
      return `https://embedmaster.link/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
    } else {
      return `https://embedmaster.link/movie/${tmdbId}`;
    }
  };

  const currentEpisodeName = currentEpisodeDetails?.name;
  const hasNextEpisode = isShow && episodes.some(e => e.episode_number === currentEpisode + 1);
  const nextEpisodeItem = isShow ? episodes.find(e => e.episode_number === currentEpisode + 1) : null;
  const hasNextSeason = isShow && !hasNextEpisode && (item.number_of_seasons ? currentSeason < item.number_of_seasons : false);

  const handlePlayNextEpisode = () => {
    if (hasNextEpisode) {
      setCurrentEpisode(currentEpisode + 1);
    } else if (hasNextSeason) {
      setCurrentSeason(currentSeason + 1);
      setCurrentEpisode(1);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            if (timer) clearInterval(timer);
            if (isShow && (hasNextEpisode || hasNextSeason)) {
              handlePlayNextEpisode();
            }
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, isShow, hasNextEpisode, hasNextSeason, duration]);

  const remainingTime = duration - currentTime;
  const showPopup = isShow && (hasNextEpisode || hasNextSeason) && remainingTime <= 45 && remainingTime > 0 && !isPopupDismissed;

  return (
    <div className="bg-[#08090d] border-b border-white/[0.08] py-8 px-4 md:px-12 relative text-left">
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-neutral-400">
              <span className="text-[#e50914] font-bold uppercase tracking-wider">
                Now Playing
              </span>
              <span aria-hidden="true">·</span>
              <span>{isShow ? "Television Series" : "Feature Film"}</span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
              {title}
            </h2>
            
            {isShow && (
              <p className="text-xs text-neutral-400 mt-1">
                Season {currentSeason}, Episode {currentEpisode}
                {currentEpisodeName ? ` — “${currentEpisodeName}”` : ""}
              </p>
            )}
          </div>

          <div id="player-headers-actions" className="flex items-center gap-2.5">
            <a
              id="btn-ad-blocker"
              href="https://ublockorigin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-neutral-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              title="Tip: Use uBlock Origin to eliminate third-party embed ads"
            >
              <Shield className="w-3.5 h-3.5 text-[#e50914]" />
              <span>Ad Blocker Advice</span>
            </a>

            <button
              id="btn-close-theater-node"
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-[#e50914] border border-white/[0.1] hover:border-[#e50914] text-neutral-400 hover:text-white transition-all duration-200 cursor-pointer shadow-lg"
              title="Close Stream"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Frame with Cinema Lighting */}
        <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl shadow-black/90">
          <iframe
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-neutral-950"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            scrolling="no"
          />

          {/* Up Next Floating Popup */}
          {showPopup && (
            <div 
              id="play-next-popup-container"
              className="absolute bottom-6 right-6 bg-[#0e0f15]/95 border border-white/[0.12] rounded-2xl p-4 w-80 shadow-2xl z-30 flex flex-col gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#e50914] tracking-widest block mb-0.5">
                    Up Next in {remainingTime}s
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-1 font-display">
                    {hasNextEpisode 
                      ? `Season ${currentSeason}, Episode ${currentEpisode + 1}`
                      : `Season ${currentSeason + 1}, Episode 1`
                    }
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                    {hasNextEpisode && nextEpisodeItem?.name ? `“${nextEpisodeItem.name}”` : "Next Chapter"}
                  </p>
                </div>

                <div className="p-2 bg-[#e50914]/15 rounded-xl shrink-0">
                  <Play className="w-4 h-4 text-[#e50914] fill-current" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  id="btn-popup-play-next"
                  onClick={handlePlayNextEpisode}
                  className="flex items-center justify-center gap-1.5 bg-[#e50914] hover:bg-[#b80710] text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  <span>Play Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                
                <button
                  id="btn-popup-dismiss-next"
                  onClick={() => setIsPopupDismissed(true)}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 py-2 rounded-xl text-xs font-medium uppercase tracking-wider transition-all cursor-pointer border border-white/[0.08]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Up Next Bar for TV Shows */}
        {isShow && (hasNextEpisode || hasNextSeason) && (
          <div className="mt-4 bg-[#0e0f14] border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#e50914]/10 rounded-xl shrink-0">
                <Play className="w-5 h-5 text-[#e50914] fill-current" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Up Next
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5 font-display">
                  {hasNextEpisode 
                    ? `Season ${currentSeason}, Episode ${currentEpisode + 1}${nextEpisodeItem?.name ? ` — “${nextEpisodeItem.name}”` : ""}`
                    : `Season ${currentSeason + 1}, Episode 1`
                  }
                </h4>
              </div>
            </div>

            <button
              id="btn-play-next-episode"
              onClick={handlePlayNextEpisode}
              className="flex items-center justify-center gap-2 bg-[#e50914] hover:bg-[#b80710] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer shrink-0"
            >
              <span>Play Next Episode</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TV Episode Guide */}
        {isShow && (
          <div className="mt-6 bg-[#0e0f14] border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ListVideo className="text-[#e50914] w-5 h-5" />
                <h3 className="text-sm font-bold tracking-tight text-white font-display">
                  Episodes & Seasons
                </h3>
              </div>

              {/* Season Selection */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
                <span className="text-xs text-neutral-400 mr-1">Season:</span>
                
                <button
                  id="btn-season-prev"
                  disabled={currentSeason <= 1}
                  onClick={() => {
                    if (currentSeason > 1) {
                      setCurrentSeason(currentSeason - 1);
                      setCurrentEpisode(1);
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    currentSeason <= 1
                      ? "opacity-30 cursor-not-allowed border-transparent text-neutral-600"
                      : "bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:border-white/[0.2] hover:text-white"
                  }`}
                  title="Previous Season"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: item.number_of_seasons || 1 }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    id={`btn-season-${sNum}`}
                    onClick={() => {
                      setCurrentSeason(sNum);
                      setCurrentEpisode(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      currentSeason === sNum
                        ? "bg-[#e50914] border-[#e50914] text-white shadow-md shadow-red-950/40"
                        : "bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:border-white/[0.2]"
                    }`}
                  >
                    Season {sNum}
                  </button>
                ))}

                <button
                  id="btn-season-next"
                  disabled={currentSeason >= (item.number_of_seasons || 1)}
                  onClick={() => {
                    if (currentSeason < (item.number_of_seasons || 1)) {
                      setCurrentSeason(currentSeason + 1);
                      setCurrentEpisode(1);
                    }
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    currentSeason >= (item.number_of_seasons || 1)
                      ? "opacity-30 cursor-not-allowed border-transparent text-neutral-600"
                      : "bg-white/[0.04] border-white/[0.08] text-neutral-300 hover:border-white/[0.2] hover:text-white"
                  }`}
                  title="Next Season"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Episodes List */}
            {loadingEpisodes ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#e50914] border-t-transparent mb-2" />
                <p className="text-xs text-neutral-400">Loading season episodes...</p>
              </div>
            ) : episodeError ? (
              <div className="py-8 text-neutral-400 text-xs text-center border border-dashed border-white/[0.1] rounded-xl">
                {episodeError}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {episodes.slice(episodePage * episodesPerPage, (episodePage + 1) * episodesPerPage).map((ep) => {
                    const isActive = ep.episode_number === currentEpisode;
                    const epStill = ep.still_path
                      ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                      : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=300&auto=format&fit=crop";
                    
                    return (
                      <button
                        key={ep.id}
                        id={`btn-episode-${ep.episode_number}`}
                        onClick={() => setCurrentEpisode(ep.episode_number)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-white/[0.08] border-[#e50914] text-white shadow-lg ring-1 ring-[#e50914]/40"
                            : "bg-black/30 border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.15]"
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className="relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.06]">
                            <img
                              src={epStill}
                              alt={ep.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1.5 py-0.5 rounded text-neutral-300 font-bold">
                              Ep {ep.episode_number}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold line-clamp-1 leading-snug ${isActive ? "text-[#e50914]" : "text-neutral-200"}`}>
                              {ep.name || `Episode ${ep.episode_number}`}
                            </h4>
                            <span className="block text-[10px] text-neutral-500 mt-0.5">
                              {ep.air_date || ""}
                            </span>
                          </div>
                        </div>
                        
                        {ep.overview && (
                          <p className="text-[11px] text-neutral-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Episodes Pagination */}
                {episodes.length > episodesPerPage && (
                  <div className="flex items-center justify-between border-t border-white/[0.08] mt-5 pt-4">
                    <span className="text-xs text-neutral-400">
                      Showing episodes {episodePage * episodesPerPage + 1}–{Math.min((episodePage + 1) * episodesPerPage, episodes.length)} of {episodes.length}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-episodes-prev-page"
                        disabled={episodePage === 0}
                        onClick={() => setEpisodePage(prev => Math.max(0, prev - 1))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                          episodePage === 0
                            ? "opacity-30 cursor-not-allowed border-transparent text-neutral-600"
                            : "bg-white/[0.05] border-white/[0.1] text-neutral-300 hover:text-white"
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>

                      <button
                        id="btn-episodes-next-page"
                        disabled={(episodePage + 1) * episodesPerPage >= episodes.length}
                        onClick={() => setEpisodePage(prev => prev + 1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                          (episodePage + 1) * episodesPerPage >= episodes.length
                            ? "opacity-30 cursor-not-allowed border-transparent text-neutral-600"
                            : "bg-white/[0.05] border-white/[0.1] text-neutral-300 hover:text-white"
                        }`}
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
