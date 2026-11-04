import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Tv,
  Film,
  AlertCircle,
  History,
  Bookmark,
  Calendar,
  Star,
  Play,
  Info,
  Check,
  LogOut,
  User,
  Download,
  Edit3,
  ChevronDown,
  Sparkles,
  Upload,
  Globe,
  X,
  Lock,
  ShieldCheck,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MediaItem, WatchHistoryItem, WatchlistItem, UserProfile } from "./types";
import { smartFetch } from "./api";
import MovieCard from "./components/MovieCard";
import MovieCarousel from "./components/MovieCarousel";
import VideoPlayer from "./components/VideoPlayer";
import DetailModal from "./components/DetailModal";
import Login from "./components/Login";
import {
  getCachedActiveUser,
  syncUserDataToServer,
  downloadServerUserInfoFile,
  clearActiveUserSession
} from "./utils/userinfo";

const BRAND_HUBS = [
  { id: "marvel", name: "Marvel", query: "marvel", bg: "from-red-950/40 to-neutral-900/40" },
  { id: "starwars", name: "Star Wars", query: "star wars", bg: "from-blue-950/40 to-neutral-900/40" },
  { id: "disney", name: "Disney", query: "disney", bg: "from-cyan-950/40 to-neutral-900/40" },
  { id: "pixar", name: "Pixar", query: "pixar", bg: "from-indigo-950/40 to-neutral-900/40" },
  { id: "scifi", name: "Sci-Fi", query: "alien", bg: "from-purple-950/40 to-neutral-900/40" },
  { id: "action", name: "Action", query: "avengers", bg: "from-amber-950/40 to-neutral-900/40" }
];

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"home" | "movies" | "series" | "watchlist" | "history">("home");
  
  // Data lists
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [popularTV, setPopularTV] = useState<MediaItem[]>([]);
  const [scifiMovies, setScifiMovies] = useState<MediaItem[]>([]);
  const [actionMovies, setActionMovies] = useState<MediaItem[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<MediaItem[]>([]);
  const [spotlightItem, setSpotlightItem] = useState<MediaItem | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);

  // Single Profile User Account State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState("");
  const [editAvatarSource, setEditAvatarSource] = useState<"pc" | "google" | "preset">("preset");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const [editPcDataUrl, setEditPcDataUrl] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // User Watchlist & History States
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Active overlays/viewer
  const [activePlayerItem, setActivePlayerItem] = useState<MediaItem | null>(null);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<MediaItem | null>(null);

  // System general states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const theaterRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Check cached active user on load
  useEffect(() => {
    try {
      const isSessionUnlocked = sessionStorage.getItem("pepflick_session_unlocked") === "true";
      const cached = getCachedActiveUser();
      if (isSessionUnlocked && cached) {
        setCurrentUser(cached);
      }
    } catch (e) {
      console.error("Session check error:", e);
    } finally {
      setSessionChecking(false);
    }
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Load watchlist & history when user logs in (from userinfo.json user record or local fallback)
  useEffect(() => {
    if (!currentUser) return;
    try {
      if (currentUser.watchlist && Array.isArray(currentUser.watchlist)) {
        setWatchlist(currentUser.watchlist);
      } else {
        const userKey = currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const persistedWatchlist = localStorage.getItem(`pepflick_watchlist_${userKey}`);
        setWatchlist(persistedWatchlist ? JSON.parse(persistedWatchlist) : []);
      }

      const existingHistory = currentUser.continueWatching || currentUser.recentlyWatched;
      if (existingHistory && Array.isArray(existingHistory)) {
        setWatchHistory(existingHistory);
      } else {
        const userKey = currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const persistedHistory = localStorage.getItem(`pepflick_history_${userKey}`);
        setWatchHistory(persistedHistory ? JSON.parse(persistedHistory) : []);
      }
    } catch (e) {
      console.error("Error loading user lists from userinfo:", e);
    }
  }, [currentUser]);

  // Fetch initial content catalog
  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [trendingRes, tvRes, scifiRes, actionRes, horrorRes] = await Promise.all([
          smartFetch("/api/trending?type=movie"),
          smartFetch("/api/trending?type=tv"),
          smartFetch("/api/discover?type=movie&genres=878"), // Sci-Fi
          smartFetch("/api/discover?type=movie&genres=28"),  // Action
          smartFetch("/api/discover?type=movie&genres=27"),  // Horror
        ]);

        if (!trendingRes.ok || !tvRes.ok || !scifiRes.ok) {
          throw new Error("Could not load the catalog feed.");
        }

        const trendingData = await trendingRes.json();
        const tvData = await tvRes.json();
        const scifiData = await scifiRes.json();
        const actionData = await actionRes.json();
        const horrorData = await horrorRes.json();

        const moviesList: MediaItem[] = trendingData.results || [];
        setTrendingMovies(moviesList);
        setPopularTV(tvData.results || []);
        setScifiMovies(scifiData.results || []);
        setActionMovies(actionData.results || []);
        setHorrorMovies(horrorData.results || []);

        if (moviesList.length > 0) {
          fetchFullDetails(moviesList[0].id, "movie", true);
        }
      } catch (err: any) {
        console.error("Catalog load error:", err);
        setErrorMsg("Failed to connect to the movie database. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  // Real-time search processing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await smartFetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.results || []).filter(
            (item: MediaItem) => item.poster_path && (item.media_type === "movie" || item.media_type === "tv")
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const fetchFullDetails = async (id: number, type: "movie" | "tv", isSpotlight = false) => {
    try {
      const res = await smartFetch(`/api/${type}/${id}`);
      if (res.ok) {
        const fullItemDetails = await res.json();
        fullItemDetails.media_type = type;

        if (isSpotlight) {
          setSpotlightItem(fullItemDetails);
        } else {
          setSelectedDetailsItem(fullItemDetails);
        }
      }
    } catch (err) {
      console.error("Details loading error:", err);
    }
  };

  const handleToggleWatchlist = (item: MediaItem) => {
    if (!currentUser) return;
    const isTv = item.first_air_date !== undefined;
    const itemType = item.media_type || (isTv ? "tv" : "movie");
    const exists = watchlist.some((w) => w.mediaId === item.id);
    let updated: WatchlistItem[];

    if (exists) {
      updated = watchlist.filter((w) => w.mediaId !== item.id);
      showToast(`Removed "${item.title || item.name}" from your list`);
    } else {
      const newItem: WatchlistItem = {
        mediaId: item.id,
        title: item.title || item.name || "Untitled",
        posterPath: item.poster_path,
        mediaType: itemType as "movie" | "tv",
        backdropPath: item.backdrop_path,
        voteAverage: item.vote_average,
        releaseDate: item.release_date || item.first_air_date
      };
      updated = [newItem, ...watchlist];
      showToast(`Added "${item.title || item.name}" to your list`);
    }

    setWatchlist(updated);
    const userKey = currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    localStorage.setItem(`pepflick_watchlist_${userKey}`, JSON.stringify(updated));
    // Persist to userinfo.json on disk
    syncUserDataToServer(currentUser.id, { watchlist: updated });
  };

  const handleUpdateHistory = (newHistoryItem: WatchHistoryItem) => {
    if (!currentUser) return;
    const filtered = watchHistory.filter((h) => h.mediaId !== newHistoryItem.mediaId);
    const updated = [newHistoryItem, ...filtered].slice(0, 20);
    setWatchHistory(updated);
    const userKey = currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    localStorage.setItem(`pepflick_history_${userKey}`, JSON.stringify(updated));
    // Persist to userinfo.json on disk
    syncUserDataToServer(currentUser.id, {
      recentlyWatched: updated,
      continueWatching: updated
    });
  };

  const handleClearWatchlist = () => {
    if (!currentUser) return;
    if (window.confirm("Clear all items in your watchlist?")) {
      setWatchlist([]);
      const userKey = currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      localStorage.removeItem(`pepflick_watchlist_${userKey}`);
      syncUserDataToServer(currentUser.id, { watchlist: [] });
      showToast("Watchlist cleared in userinfo.json");
    }
  };

  const handleClearHistory = () => {
    if (!currentUser) return;
    if (window.confirm("Clear your streaming history logs?")) {
      setWatchHistory([]);
      const userKey = currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      localStorage.removeItem(`pepflick_history_${userKey}`);
      syncUserDataToServer(currentUser.id, { recentlyWatched: [], continueWatching: [] });
      showToast("Watch history cleared in userinfo.json");
    }
  };

  const startPlayback = async (item: MediaItem) => {
    const isTv = item.first_air_date !== undefined;
    const itemType = item.media_type || (isTv ? "tv" : "movie");

    try {
      const response = await smartFetch(`/api/${itemType}/${item.id}`);
      if (response.ok) {
        const fullItem = await response.json();
        fullItem.media_type = itemType;
        setActivePlayerItem(fullItem);
      } else {
        setActivePlayerItem(item);
      }
    } catch (e) {
      setActivePlayerItem(item);
    }
    setTimeout(() => {
      theaterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLogout = () => {
    clearActiveUserSession();
    setCurrentUser(null);
    setShowProfileDropdown(false);
  };

  const handleOpenEditProfile = () => {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditAvatarSource(currentUser.avatarSource);
    setEditGoogleUrl(currentUser.avatarSource === "google" ? currentUser.avatar : "");
    setEditPcDataUrl(currentUser.avatarSource === "pc" ? currentUser.avatar : null);
    setEditPassword(currentUser.password || currentUser.passwordHash || "");
    setShowEditProfileModal(true);
    setShowProfileDropdown(false);
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      alert("Please provide a valid name.");
      return;
    }

    let finalAvatar = currentUser.avatar;
    if (editAvatarSource === "pc" && editPcDataUrl) {
      finalAvatar = editPcDataUrl;
    } else if (editAvatarSource === "google" && editGoogleUrl.trim()) {
      finalAvatar = editGoogleUrl.trim();
    }

    const updatedUser = await syncUserDataToServer(currentUser.id, {
      name: trimmedName,
      avatar: finalAvatar,
      avatarSource: editAvatarSource,
      password: editPassword || currentUser.password
    });

    if (updatedUser) {
      setCurrentUser(updatedUser);
    } else {
      setCurrentUser({
        ...currentUser,
        name: trimmedName,
        avatar: finalAvatar,
        avatarSource: editAvatarSource,
        password: editPassword || currentUser.password,
        updatedAt: new Date().toISOString()
      });
    }

    setShowEditProfileModal(false);
    showToast("Profile updated and synced to userinfo.json!");
  };

  const handleEditPcPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditPcDataUrl(reader.result as string);
      setEditAvatarSource("pc");
    };
    reader.readAsDataURL(file);
  };

  // Switch spotlight movie
  const cycleSpotlight = (index: number) => {
    if (trendingMovies[index]) {
      setSpotlightIndex(index);
      fetchFullDetails(trendingMovies[index].id, "movie", true);
    }
  };

  const watchlistMediaIds = watchlist.map((w) => w.mediaId);

  // If user session checking
  if (sessionChecking) {
    return (
      <div className="min-h-screen bg-[#07080b] text-white flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
          Loading PepFlick...
        </span>
      </div>
    );
  }

  // If user is not authenticated or needs to unlock
  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={(profile) => {
          setCurrentUser(profile);
          sessionStorage.setItem("pepflick_session_unlocked", "true");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07080b] text-white font-sans selection:bg-[#e50914] selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#14151c]/95 border border-white/[0.15] text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4 text-[#e50914]" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPPER TOP BAR (Top Bar Contract: 3 zones separated by gap-8) */}
      <header className="sticky top-0 z-40 bg-[#07080b]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-12 py-3.5 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div
          onClick={() => {
            setActiveTab("home");
            setIsSearching(false);
            setSearchQuery("");
          }}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#b80710] to-[#e50914] flex items-center justify-center shadow-lg shadow-red-950/50">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-black text-white tracking-tight uppercase font-display whitespace-nowrap">
            PEP<span className="text-[#e50914]">FLICK</span>
          </span>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-neutral-300">
          {[
            { tag: "home", label: "Home" },
            { tag: "movies", label: "Movies" },
            { tag: "series", label: "TV Shows" },
            { tag: "watchlist", label: `My List ${watchlist.length > 0 ? `(${watchlist.length})` : ""}` },
            { tag: "history", label: "History" },
          ].map((tab) => {
            const isActive = activeTab === tab.tag && !isSearching;
            return (
              <button
                key={tab.tag}
                onClick={() => {
                  setActiveTab(tab.tag as any);
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive ? "text-white font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="navUnderline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#e50914] rounded-full shadow-[0_0_8px_#e50914]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search & User Profile Capsule */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search movies, series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-36 sm:w-56 bg-white/[0.04] focus:bg-white/[0.08] border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-neutral-500 transition-all focus:w-48 sm:focus:w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Profile Capsule Trigger */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] rounded-xl transition-all cursor-pointer"
              title="Profile menu"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-[#e50914] bg-neutral-900 shrink-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden sm:inline text-xs font-bold text-white max-w-[90px] truncate font-display">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-[#0e0f15]/95 border border-white/[0.1] rounded-2xl shadow-2xl p-4 z-50 text-left backdrop-blur-xl"
                >
                  {/* Profile Card Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08] mb-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-[#e50914] bg-neutral-900 shrink-0">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate font-display">
                        {currentUser.name}
                      </h4>
                      <span className="text-[10px] text-[#e50914] font-semibold block mt-0.5">
                        Saved in userinfo.json
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => {
                        downloadServerUserInfoFile();
                        setShowProfileDropdown(false);
                        showToast("userinfo.json downloaded!");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <Download className="w-3.5 h-3.5 text-[#e50914]" />
                      <span>Download userinfo.json</span>
                    </button>

                    <button
                      onClick={handleOpenEditProfile}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                    >
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Switch Profile</span>
                    </button>

                    <div className="pt-2 border-t border-white/[0.08] mt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left font-semibold text-[11px]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="md:hidden flex items-center justify-around bg-[#08090d] border-b border-white/[0.06] px-2 py-2.5 text-[11px] font-bold text-neutral-400">
        {[
          { tag: "home", label: "Home" },
          { tag: "movies", label: "Movies" },
          { tag: "series", label: "TV Shows" },
          { tag: "watchlist", label: "My List" },
          { tag: "history", label: "History" },
        ].map((tab) => (
          <button
            key={tab.tag}
            onClick={() => {
              setActiveTab(tab.tag as any);
              setIsSearching(false);
              setSearchQuery("");
            }}
            className={`px-2 py-1 rounded-lg transition-colors ${
              activeTab === tab.tag && !isSearching
                ? "text-[#e50914] bg-white/[0.05]"
                : "hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* THEATER PLAYER CONTAINER */}
      <div ref={theaterRef}>
        {activePlayerItem && (
          <VideoPlayer
            item={activePlayerItem}
            onClose={() => setActivePlayerItem(null)}
            onUpdateHistory={handleUpdateHistory}
          />
        )}
      </div>

      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-1 pb-16">
        
        {/* SEARCH RESULTS VIEW */}
        {isSearching ? (
          <div className="px-4 md:px-12 py-10 text-left">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-8">
              <h2 className="text-xl font-bold text-white font-display">
                Search Results: &ldquo;{searchQuery}&rdquo;
              </h2>
              <span className="text-xs text-neutral-400">
                {searchLoading ? "Searching catalog..." : `${searchResults.length} matches`}
              </span>
            </div>

            {searchResults.length === 0 && !searchLoading ? (
              <div className="py-20 text-center max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">No Titles Found</h3>
                <p className="text-xs text-neutral-500">
                  Try searching with different keywords, director names, or actor titles.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 justify-items-center">
                {searchResults.map((item) => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    isInWatchlist={watchlistMediaIds.includes(item.id)}
                    onSelect={(i) => fetchFullDetails(i.id, i.media_type || (i.first_air_date ? "tv" : "movie"))}
                    onPlay={startPlayback}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "watchlist" ? (
          /* MY LIST VIEW */
          <div className="px-4 md:px-12 py-10 text-left max-w-7xl mx-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-white font-display">
                  My List
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Your bookmarked films and series
                </p>
              </div>

              {watchlist.length > 0 && (
                <button
                  onClick={handleClearWatchlist}
                  className="text-xs font-semibold text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Clear List
                </button>
              )}
            </div>

            {watchlist.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto">
                <Bookmark className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Your List is Empty</h3>
                <p className="text-xs text-neutral-500 mb-5">
                  Explore titles on PepFlick and click the bookmark button on any movie or TV show to save it here.
                </p>
                <button
                  onClick={() => setActiveTab("home")}
                  className="px-5 py-2.5 bg-[#e50914] hover:bg-[#b80710] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-950/40"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 justify-items-center">
                {watchlist.map((w) => {
                  const dummyMedia: MediaItem = {
                    id: w.mediaId,
                    title: w.mediaType === "movie" ? w.title : undefined,
                    name: w.mediaType === "tv" ? w.title : undefined,
                    poster_path: w.posterPath,
                    backdrop_path: w.backdropPath,
                    media_type: w.mediaType,
                    overview: "Saved bookmark",
                    genre_ids: [],
                    popularity: 1,
                    vote_average: w.voteAverage,
                    vote_count: 1,
                    release_date: w.mediaType === "movie" ? w.releaseDate : undefined,
                    first_air_date: w.mediaType === "tv" ? w.releaseDate : undefined
                  };

                  return (
                    <MovieCard
                      key={w.mediaId}
                      item={dummyMedia}
                      isInWatchlist={true}
                      onSelect={(i) => fetchFullDetails(i.id, i.media_type || "movie")}
                      onPlay={startPlayback}
                      onToggleWatchlist={handleToggleWatchlist}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "history" ? (
          /* HISTORY VIEW */
          <div className="px-4 md:px-12 py-10 text-left max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-white font-display">
                  Watch History
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Recent streams and saved episode checkpoints
                </p>
              </div>

              {watchHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs font-semibold text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {watchHistory.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto">
                <History className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">No Streaming History</h3>
                <p className="text-xs text-neutral-500 mb-5">
                  When you play movies or television series, your watch progress is logged here so you can resume anytime.
                </p>
                <button
                  onClick={() => setActiveTab("home")}
                  className="px-5 py-2.5 bg-[#e50914] hover:bg-[#b80710] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-950/40"
                >
                  Start Watching
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {watchHistory.map((item) => {
                  const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  const dummyMedia: MediaItem = {
                    id: item.mediaId,
                    title: item.mediaType === "movie" ? item.title : undefined,
                    name: item.mediaType === "tv" ? item.title : undefined,
                    poster_path: item.posterPath,
                    backdrop_path: null,
                    media_type: item.mediaType,
                    overview: "Playback history",
                    genre_ids: [],
                    popularity: 1,
                    vote_average: item.progressPercent / 10,
                    vote_count: 1
                  };

                  return (
                    <div
                      key={item.mediaId}
                      className="flex items-center gap-4 p-3.5 bg-[#0e0f14] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl transition-all"
                    >
                      <div className="w-14 sm:w-16 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.06]">
                        <img
                          src={item.posterPath ? `https://image.tmdb.org/t/p/w185${item.posterPath}` : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=150"}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold mb-1">
                          <span className="text-emerald-400">{item.progressPercent}% Watched</span>
                          <span aria-hidden="true">·</span>
                          <span className="uppercase text-neutral-300">{item.mediaType === "tv" ? "TV Show" : "Movie"}</span>
                        </div>

                        <h4 className="text-sm font-bold text-white truncate font-display">
                          {item.title}
                        </h4>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-1">
                          {item.lastSeason && (
                            <span>S{item.lastSeason} E{item.lastEpisode} · </span>
                          )}
                          <span>Streamed: {dateStr}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startPlayback(dummyMedia)}
                          className="bg-[#e50914] hover:bg-[#b80710] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* HOME, MOVIES, OR SERIES TABS */
          <div>
            {/* HERO CINEMATIC SPOTLIGHT (Active on Home or Movies) */}
            {spotlightItem && (
              <div className="relative w-full min-h-[500px] md:min-h-[640px] flex items-end justify-start overflow-hidden text-left border-b border-white/[0.08]">
                {/* Full-Bleed Backdrop Image */}
                <div className="absolute inset-0">
                  <img
                    src={
                      spotlightItem.backdrop_path
                        ? `https://image.tmdb.org/t/p/original${spotlightItem.backdrop_path}`
                        : "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop"
                    }
                    alt={spotlightItem.title || spotlightItem.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
                  />
                  {/* Cinematic Multi-stop Dark Vignette Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-[#07080b]/60 to-black/30" />
                  <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#07080b] via-[#07080b]/80 to-transparent hidden md:block" />
                </div>

                {/* Hero Content Information */}
                <div className="relative z-10 px-6 md:px-16 pb-14 md:pb-20 max-w-3xl">
                  {/* Unboxed Metadata Header Line */}
                  <div className="flex items-center gap-2.5 text-xs text-neutral-300 font-semibold mb-3">
                    <span className="text-emerald-400 font-bold">
                      {spotlightItem.vote_average ? `${Math.min(100, Math.round(spotlightItem.vote_average * 10 + 15))}% Match` : "98% Match"}
                    </span>
                    <span aria-hidden="true" className="text-neutral-500">·</span>
                    <span className="uppercase text-white tracking-wider text-[11px] font-bold">
                      {spotlightItem.media_type === "tv" ? "TV Series" : "Feature Film"}
                    </span>
                    {spotlightItem.release_date && (
                      <>
                        <span aria-hidden="true" className="text-neutral-500">·</span>
                        <span>{spotlightItem.release_date.substring(0, 4)}</span>
                      </>
                    )}
                    {spotlightItem.vote_average && (
                      <>
                        <span aria-hidden="true" className="text-neutral-500">·</span>
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                          {spotlightItem.vote_average.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05] mb-3 font-display drop-shadow-xl text-balance">
                    {spotlightItem.title || spotlightItem.name}
                  </h1>

                  {/* Tagline or Overview */}
                  <p className="text-xs sm:text-sm md:text-base text-neutral-300 line-clamp-3 leading-relaxed mb-7 max-w-2xl font-normal drop-shadow">
                    {spotlightItem.overview}
                  </p>

                  {/* Hero Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      id="btn-play-spotlight"
                      onClick={() => startPlayback(spotlightItem)}
                      className="flex items-center gap-2.5 bg-[#e50914] hover:bg-[#b80710] text-white px-7 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-xl shadow-red-950/50 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Watch Now</span>
                    </button>

                    <button
                      onClick={() => handleToggleWatchlist(spotlightItem)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold transition-all border cursor-pointer backdrop-blur-md ${
                        watchlistMediaIds.includes(spotlightItem.id)
                          ? "bg-[#e50914] border-[#e50914] text-white"
                          : "bg-white/[0.08] hover:bg-white/[0.15] border-white/[0.15] text-white"
                      }`}
                    >
                      {watchlistMediaIds.includes(spotlightItem.id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>In My List</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Add to List</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedDetailsItem(spotlightItem)}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] backdrop-blur-md transition-all cursor-pointer"
                    >
                      <Info className="w-4 h-4" />
                      <span>Details</span>
                    </button>
                  </div>

                  {/* Spotlight Quick Switcher Dots/Thumbnails */}
                  {trendingMovies.length > 1 && (
                    <div className="flex items-center gap-2 mt-8">
                      {trendingMovies.slice(0, 5).map((m, idx) => (
                        <button
                          key={m.id}
                          onClick={() => cycleSpotlight(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            spotlightIndex === idx
                              ? "w-8 bg-[#e50914]"
                              : "w-3 bg-white/30 hover:bg-white/60"
                          }`}
                          title={m.title || m.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BRAND / UNIVERSE CURATED HUBS */}
            {activeTab === "home" && (
              <div className="px-4 md:px-12 pt-8 pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {BRAND_HUBS.map((hub) => (
                    <button
                      key={hub.id}
                      onClick={() => setSearchQuery(hub.query)}
                      className="h-20 sm:h-24 rounded-2xl border border-white/[0.08] hover:border-[#e50914]/60 bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:from-[#e50914]/15 hover:to-transparent flex flex-col items-center justify-center gap-1.5 p-3 transition-all duration-300 hover:scale-[1.03] shadow-lg group cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-neutral-400 group-hover:text-[#e50914] transition-colors" />
                      <span className="font-display text-sm font-bold tracking-tight text-white group-hover:text-white">
                        {hub.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CONTINUE WATCHING ROW */}
            {watchHistory.length > 0 && activeTab === "home" && (
              <div className="my-8 px-4 md:px-12 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Continue Watching</span>
                    <span className="text-xs text-neutral-500 font-sans font-normal">
                      ({watchHistory.length})
                    </span>
                  </h3>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-neutral-400 hover:text-white bg-white/[0.04] px-3 py-1 rounded-lg border border-white/[0.06] cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                  {watchHistory.map((item) => {
                    const dummyMedia: MediaItem = {
                      id: item.mediaId,
                      title: item.mediaType === "movie" ? item.title : undefined,
                      name: item.mediaType === "tv" ? item.title : undefined,
                      poster_path: item.posterPath,
                      backdrop_path: null,
                      media_type: item.mediaType,
                      overview: "Playback history",
                      genre_ids: [],
                      popularity: 1,
                      vote_average: item.progressPercent / 10,
                      vote_count: 1
                    };

                    return (
                      <div key={item.mediaId} className="relative group/history shrink-0 w-40 sm:w-48">
                        <div className="h-56 sm:h-64 rounded-2xl overflow-hidden relative border border-white/[0.08] hover:border-[#e50914] transition-all duration-300 cursor-pointer bg-[#0e0f14] shadow-xl">
                          <img
                            src={item.posterPath ? `https://image.tmdb.org/t/p/w300${item.posterPath}` : "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=200"}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3.5">
                            <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                              {item.mediaType === "tv" ? "TV Series" : "Movie"}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate font-display mb-0.5">
                              {item.title}
                            </h4>
                            {item.lastSeason && (
                              <span className="text-[10px] text-neutral-400 block font-medium">
                                S{item.lastSeason} E{item.lastEpisode}
                              </span>
                            )}
                            <div className="w-full h-1 bg-white/[0.1] rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-[#e50914] rounded-full shadow-[0_0_8px_#e50914]"
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Resume Button */}
                        <button
                          onClick={() => startPlayback(dummyMedia)}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover/history:opacity-100 flex items-center justify-center transition-opacity duration-200 rounded-2xl cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 bg-[#e50914] hover:bg-[#b80710] text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-xl uppercase tracking-wider">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Resume</span>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CURATED CAROUSELS */}
            {activeTab === "home" && (
              <>
                <MovieCarousel
                  title="Trending Now"
                  subtitle="Most watched titles across all genres today"
                  items={trendingMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="Popular Television Series"
                  subtitle="Binge-worthy shows and critically acclaimed broadcasts"
                  items={popularTV}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "tv")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="Sci-Fi & Cosmic Horizons"
                  subtitle="Journey through space, time, and futuristic realities"
                  items={scifiMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="High-Octane Action"
                  subtitle="Adrenaline-pumping blockbusters and stunt marvels"
                  items={actionMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="Horror & Thrillers"
                  subtitle="Chilling mysteries and psychological shockers"
                  items={horrorMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </>
            )}

            {activeTab === "movies" && (
              <>
                <MovieCarousel
                  title="All Trending Movies"
                  items={trendingMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="Sci-Fi & Fantasy Films"
                  items={scifiMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="Action & Adventure Films"
                  items={actionMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
                <MovieCarousel
                  title="Horror Films"
                  items={horrorMovies}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "movie")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </>
            )}

            {activeTab === "series" && (
              <>
                <MovieCarousel
                  title="Top Television Series"
                  items={popularTV}
                  watchlist={watchlistMediaIds}
                  onSelect={(i) => fetchFullDetails(i.id, "tv")}
                  onPlay={startPlayback}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* DETAIL MODAL OVERLAY */}
      {selectedDetailsItem && (
        <DetailModal
          item={selectedDetailsItem}
          onClose={() => setSelectedDetailsItem(null)}
          onPlay={startPlayback}
          watchlist={watchlistMediaIds}
          onToggleWatchlist={handleToggleWatchlist}
          onSelectSimilar={(sim) => fetchFullDetails(sim.id, sim.media_type || "movie")}
        />
      )}

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f1015] border border-white/[0.1] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    Edit Profile
                  </h3>
                  <span className="text-xs text-neutral-400">
                    Update profile details & download new userinfo.json
                  </span>
                </div>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfileEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Profile Picture
                  </label>
                  
                  {/* Avatar source tabs */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setEditAvatarSource("pc")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editAvatarSource === "pc"
                          ? "bg-[#e50914] text-white"
                          : "bg-white/[0.05] text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>From PC</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditAvatarSource("google")}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editAvatarSource === "google"
                          ? "bg-[#e50914] text-white"
                          : "bg-white/[0.05] text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>From Google / URL</span>
                    </button>
                  </div>

                  {editAvatarSource === "pc" && (
                    <div>
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleEditPcPhotoSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full border border-dashed border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.05] py-3 rounded-xl text-center text-xs font-semibold cursor-pointer"
                      >
                        Click to select new image from PC
                      </button>
                    </div>
                  )}

                  {editAvatarSource === "google" && (
                    <input
                      type="url"
                      placeholder="Paste Google photo or web URL"
                      value={editGoogleUrl}
                      onChange={(e) => setEditGoogleUrl(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2 px-3 text-xs text-white"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Update Unique Password
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#e50914] hover:bg-[#b80710] text-white text-xs font-bold rounded-xl shadow-md uppercase tracking-wider"
                  >
                    Save & Download userinfo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.08] py-10 px-4 md:px-12 bg-[#06070a] text-center text-xs text-neutral-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-white text-base">
              PEP<span className="text-[#e50914]">FLICK</span>
            </span>
            <span className="text-neutral-600">·</span>
            <span>Cinema Discovery & Player</span>
          </div>
          
          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span>Profiles Saved to userinfo.json</span>
            <span className="text-neutral-600">·</span>
            <button
              onClick={() => {
                downloadServerUserInfoFile();
                showToast("userinfo.json downloaded!");
              }}
              className="hover:text-white underline cursor-pointer"
            >
              Download userinfo.json
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
