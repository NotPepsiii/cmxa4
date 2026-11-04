import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Lock,
  Upload,
  Globe,
  Download,
  FileText,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  Plus,
  ChevronLeft,
  Film
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import {
  fetchServerProfiles,
  createProfileOnServer,
  loginProfileOnServer,
  downloadServerUserInfoFile
} from "../utils/userinfo";

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

const PRESET_AVATARS = [
  {
    id: "preset_1",
    name: "Cyber Neon",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop"
  },
  {
    id: "preset_2",
    name: "Cosmic Voyager",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop"
  },
  {
    id: "preset_3",
    name: "Cinema Director",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=250&auto=format&fit=crop"
  },
  {
    id: "preset_4",
    name: "Noir Detective",
    url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop"
  },
  {
    id: "preset_5",
    name: "Scarlet Hero",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=250&auto=format&fit=crop"
  },
  {
    id: "preset_6",
    name: "Golden Rebel",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop"
  }
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [viewMode, setViewMode] = useState<"profiles" | "unlock" | "create">("profiles");

  // Unlock state
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);

  // Create state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarSource, setAvatarSource] = useState<"pc" | "google" | "preset">("preset");
  const [selectedPresetUrl, setSelectedPresetUrl] = useState(PRESET_AVATARS[0].url);
  const [googlePhotoUrl, setGooglePhotoUrl] = useState("");
  const [pcPhotoDataUrl, setPcPhotoDataUrl] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const pcPhotoInputRef = useRef<HTMLInputElement>(null);

  // Load existing profiles from userinfo.json
  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { exists, profiles: serverProfiles } = await fetchServerProfiles();
      setProfiles(serverProfiles);
      if (!exists || serverProfiles.length === 0) {
        setViewMode("create");
      } else {
        setViewMode("profiles");
      }
    } catch (e) {
      console.error("Failed to load profiles:", e);
      setViewMode("create");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const currentCreateAvatar = 
    avatarSource === "pc" && pcPhotoDataUrl
      ? pcPhotoDataUrl
      : avatarSource === "google" && googlePhotoUrl.trim()
      ? googlePhotoUrl.trim()
      : selectedPresetUrl;

  const handlePcPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCreateError("Please select an image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setCreateError("Profile picture should be smaller than 8MB.");
      return;
    }

    setCreateError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPcPhotoDataUrl(reader.result as string);
      setAvatarSource("pc");
    };
    reader.readAsDataURL(file);
  };

  // Click on a profile card
  const handleSelectProfile = (p: UserProfile) => {
    setSelectedProfile(p);
    setUnlockPassword("");
    setUnlockError(null);
    setViewMode("unlock");
  };

  // Submit password unlock
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    if (!unlockPassword) {
      setUnlockError("Please enter your unique password.");
      return;
    }

    setUnlockSubmitting(true);
    setUnlockError(null);

    try {
      const user = await loginProfileOnServer({
        userId: selectedProfile.id,
        name: selectedProfile.name,
        password: unlockPassword
      });

      onLoginSuccess(user);
    } catch (err: any) {
      setUnlockError(err.message || "Incorrect unique password.");
    } finally {
      setUnlockSubmitting(false);
    }
  };

  // Submit profile creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setCreateError("Please enter a profile name.");
      return;
    }

    if (password.length < 3) {
      setCreateError("Password must be at least 3 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setCreateError("Passwords do not match. Please verify.");
      return;
    }

    if (avatarSource === "google" && !googlePhotoUrl.trim()) {
      setCreateError("Please provide a valid Google or web photo URL, or select from presets.");
      return;
    }

    setCreateSubmitting(true);

    try {
      const newUser = await createProfileOnServer({
        name: cleanName,
        password,
        avatar: currentCreateAvatar,
        avatarSource
      });

      setSuccessToast(`Profile created and saved into userinfo.json!`);
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 500);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create profile in userinfo.json");
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#e50914] selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-900/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="pt-8 pb-4 px-6 md:px-12 max-w-7xl mx-auto w-full flex items-center justify-between gap-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#b80710] to-[#e50914] flex items-center justify-center shadow-lg shadow-red-900/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-black text-white tracking-tight uppercase font-display">
            PEP<span className="text-[#e50914]">FLICK</span>
          </span>
        </div>

        {/* View / Download userinfo.json file button */}
        <button
          type="button"
          onClick={downloadServerUserInfoFile}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
          title="Download the live userinfo.json file from PepFlick"
        >
          <FileText className="w-3.5 h-3.5 text-[#e50914]" />
          <span className="hidden sm:inline">Download userinfo.json</span>
          <span className="sm:hidden">userinfo.json</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-2xl text-center">
          
          {/* Toast */}
          <AnimatePresence>
            {successToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 mx-auto max-w-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-lg"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{successToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-neutral-400 font-semibold tracking-wider">
                Loading Profiles from userinfo.json...
              </p>
            </div>
          ) : viewMode === "profiles" ? (
            /* VIEW 1: WHO IS WATCHING? (Multi-User Profile Picker) */
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="py-6"
            >
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-display mb-2">
                Who&apos;s Watching?
              </h1>
              <p className="text-xs md:text-sm text-neutral-400 mb-10 max-w-md mx-auto">
                Select your profile from <code className="text-[#e50914] font-mono">userinfo.json</code> or add a new profile.
              </p>

              {/* Profiles Grid */}
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 max-w-2xl mx-auto">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-[#e50914] bg-neutral-900 shadow-xl transition-all duration-300 relative">
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    <span className="mt-3 text-xs sm:text-sm font-bold text-neutral-300 group-hover:text-white transition-colors truncate max-w-[110px] font-display">
                      {profile.name}
                    </span>
                  </button>
                ))}

                {/* Add Profile Card */}
                <button
                  onClick={() => {
                    setName("");
                    setPassword("");
                    setConfirmPassword("");
                    setCreateError(null);
                    setViewMode("create");
                  }}
                  className="group flex flex-col items-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-white/[0.15] group-hover:border-[#e50914] bg-white/[0.02] group-hover:bg-white/[0.05] flex items-center justify-center transition-all duration-300 shadow-lg">
                    <Plus className="w-8 h-8 text-neutral-400 group-hover:text-[#e50914] transition-colors" />
                  </div>
                  <span className="mt-3 text-xs sm:text-sm font-bold text-neutral-400 group-hover:text-white transition-colors font-display">
                    Add Profile
                  </span>
                </button>
              </div>

              <div className="mt-12">
                <span className="text-[11px] text-neutral-500 bg-white/[0.03] border border-white/[0.06] px-3.5 py-1.5 rounded-full">
                  All profiles, watchlist & continue watching are saved directly in <strong className="text-white">userinfo.json</strong>
                </span>
              </div>
            </motion.div>
          ) : viewMode === "unlock" && selectedProfile ? (
            /* VIEW 2: UNLOCK SELECTED PROFILE WITH PASSWORD */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="max-w-md mx-auto bg-[#0f1015]/95 border border-white/[0.08] rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative text-left"
            >
              <button
                type="button"
                onClick={() => setViewMode("profiles")}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white mb-4 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Switch Profile</span>
              </button>

              <div className="text-center mb-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#e50914] shadow-xl shadow-red-950/40 bg-neutral-900 mx-auto mb-3">
                  <img
                    src={selectedProfile.avatar}
                    alt={selectedProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl font-bold text-white font-display">
                  {selectedProfile.name}
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter your unique password to enter PepFlick
                </p>
              </div>

              {unlockError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{unlockError}</span>
                </div>
              )}

              <form onSubmit={handleUnlockSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Unique Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="profile-password-input"
                      type={showUnlockPassword ? "text" : "password"}
                      autoFocus
                      required
                      placeholder="Enter password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-neutral-600 transition-all focus:ring-1 focus:ring-[#e50914]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-unlock-profile"
                  type="submit"
                  disabled={unlockSubmitting}
                  className="w-full py-3 bg-[#e50914] hover:bg-[#b80710] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-950/40 cursor-pointer"
                >
                  <span>{unlockSubmitting ? "Unlocking..." : "Unlock & Stream"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          ) : (
            /* VIEW 3: CREATE PROFILE & APPEND TO userinfo.json */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto bg-[#0f1015]/95 border border-white/[0.08] rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative text-left"
            >
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode("profiles")}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white mb-4 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Profiles</span>
                </button>
              )}

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-[#e50914] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {profiles.length === 0 ? "First User • Creates userinfo.json" : "Add Profile • Saves to userinfo.json"}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-white font-display">
                  Create Your Profile
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  {profiles.length === 0
                    ? "As the first user, your profile initializes userinfo.json. Next users will add onto it."
                    : "Your profile, picture, password, and history will be saved directly in userinfo.json."
                  }
                </p>
              </div>

              {createError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* 1. Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Profile Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="create-profile-name"
                      type="text"
                      required
                      placeholder="e.g. Alex or Pepsi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-600 transition-all focus:ring-1 focus:ring-[#e50914]/30"
                    />
                  </div>
                </div>

                {/* 2. Avatar Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Profile Picture (PC, Google, or Preset)
                  </label>

                  <div className="flex items-center gap-3.5 p-3 bg-black/30 border border-white/[0.06] rounded-xl mb-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-[#e50914] bg-neutral-900 shrink-0 shadow-md">
                      <img
                        src={currentCreateAvatar}
                        alt="Avatar preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                        }}
                      />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                        Selected Avatar
                      </span>
                      <p className="text-xs font-semibold text-white truncate mt-0.5">
                        {avatarSource === "pc" ? "Uploaded from PC" : avatarSource === "google" ? "Google / Web Photo" : "Curated Preset"}
                      </p>
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        Any photo from PC or Google can be added
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 border border-white/[0.06] rounded-xl mb-3">
                    <button
                      type="button"
                      onClick={() => setAvatarSource("pc")}
                      className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        avatarSource === "pc"
                          ? "bg-[#e50914] text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>From PC</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarSource("google")}
                      className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        avatarSource === "google"
                          ? "bg-[#e50914] text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Google/Web</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarSource("preset")}
                      className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        avatarSource === "preset"
                          ? "bg-[#e50914] text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Presets</span>
                    </button>
                  </div>

                  {/* PC Tab */}
                  {avatarSource === "pc" && (
                    <div>
                      <input
                        type="file"
                        ref={pcPhotoInputRef}
                        onChange={handlePcPhotoSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => pcPhotoInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-white/[0.12] hover:border-[#e50914]/60 bg-white/[0.02] hover:bg-white/[0.04] p-3 rounded-xl text-center cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                        <span className="text-xs font-semibold text-white block">
                          Click to select image from your PC
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          PNG, JPG, WebP
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Google Tab */}
                  {avatarSource === "google" && (
                    <div>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="Paste Google profile photo URL"
                          value={googlePhotoUrl}
                          onChange={(e) => setGooglePhotoUrl(e.target.value)}
                          className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Presets Tab */}
                  {avatarSource === "preset" && (
                    <div className="grid grid-cols-6 gap-2">
                      {PRESET_AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedPresetUrl(avatar.url)}
                          className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                            selectedPresetUrl === avatar.url
                              ? "border-[#e50914] scale-105 shadow-md shadow-red-950/40"
                              : "border-white/[0.08] opacity-70 hover:opacity-100"
                          }`}
                          title={avatar.name}
                        >
                          <img
                            src={avatar.url}
                            alt={avatar.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Unique Password */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Unique Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="create-password-input"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Create unique password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2 pl-10 pr-10 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="create-confirm-password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/[0.08] focus:border-[#e50914] focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="btn-create-profile-submit"
                  type="submit"
                  disabled={createSubmitting}
                  className="w-full py-3 bg-[#e50914] hover:bg-[#b80710] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-950/40 cursor-pointer mt-4"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {createSubmitting ? "Saving to userinfo.json..." : "Save Profile to userinfo.json"}
                  </span>
                </button>
              </form>
            </motion.div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-[11px] text-neutral-500 z-10">
        <p>PepFlick Cinema • User data saved on disk to <code className="text-[#e50914]">userinfo.json</code> with recently watched, continue watching, profile picture, name and password</p>
      </footer>
    </div>
  );
}
