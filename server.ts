import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;
const USERINFO_FILE = path.resolve(process.cwd(), "userinfo.json");

// Middleware to parse JSON payloads (with generous limit for base64 PC images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to read userinfo file from disk
function readUserInfoData() {
  if (!fs.existsSync(USERINFO_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(USERINFO_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading userinfo.json:", err);
    return null;
  }
}

// Helper to write userinfo file to disk
function writeUserInfoData(data: any) {
  try {
    fs.writeFileSync(USERINFO_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing userinfo.json:", err);
    return false;
  }
}

// API: List all user profiles stored in userinfo.json
app.get("/api/userinfo/profiles", (req, res) => {
  const data = readUserInfoData();
  if (!data || !data.users) {
    return res.json({ exists: false, profiles: [] });
  }

  const profiles = Object.values(data.users).map((u: any) => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    avatarSource: u.avatarSource,
    createdAt: u.createdAt,
    hasPassword: Boolean(u.password)
  }));

  res.json({ exists: true, profiles, totalUsers: profiles.length });
});

// API: Create a new user profile and append/save to userinfo.json
app.post("/api/userinfo/create", (req, res) => {
  const { name, password, avatar, avatarSource } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Profile name is required." });
  }
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  let data = readUserInfoData();
  // If first user, create the userinfo structure
  if (!data || typeof data !== "object" || !data.users) {
    data = {
      version: 1,
      appName: "PepFlick",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      users: {}
    };
  }

  const cleanName = name.trim();
  // Check if name is already taken (case-insensitive)
  const existingUser = Object.values(data.users).find(
    (u: any) => u.name.toLowerCase() === cleanName.toLowerCase()
  );

  if (existingUser) {
    return res.status(400).json({ error: `A profile named "${cleanName}" already exists. Choose a different name or log into it.` });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser = {
    id: userId,
    name: cleanName,
    password: String(password),
    avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop",
    avatarSource: avatarSource || "preset",
    recentlyWatched: [],
    continueWatching: [],
    watchlist: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.users[userId] = newUser;
  data.updatedAt = new Date().toISOString();

  const success = writeUserInfoData(data);
  if (!success) {
    return res.status(500).json({ error: "Failed to write userinfo.json to disk." });
  }

  console.log(`[PepFlick] Added user "${cleanName}" to userinfo.json. Total users: ${Object.keys(data.users).length}`);
  res.json({ success: true, user: newUser });
});

// API: Unlock / Log into a profile
app.post("/api/userinfo/login", (req, res) => {
  const { userId, name, password } = req.body;
  const data = readUserInfoData();

  if (!data || !data.users) {
    return res.status(404).json({ error: "No userinfo.json file found. Please create a profile first." });
  }

  let targetUser = null;
  if (userId && data.users[userId]) {
    targetUser = data.users[userId];
  } else if (name) {
    targetUser = Object.values(data.users).find(
      (u: any) => u.name.toLowerCase() === String(name).trim().toLowerCase()
    );
  }

  if (!targetUser) {
    return res.status(404).json({ error: "Profile not found." });
  }

  if (targetUser.password !== String(password)) {
    return res.status(401).json({ error: "Incorrect unique password." });
  }

  res.json({ success: true, user: targetUser });
});

// API: Update user state (recentlyWatched, continueWatching, watchlist, profile edits)
app.post("/api/userinfo/sync", (req, res) => {
  const { userId, recentlyWatched, continueWatching, watchlist, name, avatar, avatarSource, password } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required for sync." });
  }

  const data = readUserInfoData();
  if (!data || !data.users || !data.users[userId]) {
    return res.status(404).json({ error: "User not found in userinfo.json." });
  }

  const user = data.users[userId];

  if (Array.isArray(recentlyWatched)) {
    user.recentlyWatched = recentlyWatched;
  }
  if (Array.isArray(continueWatching)) {
    user.continueWatching = continueWatching;
  }
  if (Array.isArray(watchlist)) {
    user.watchlist = watchlist;
  }
  if (name && typeof name === "string") {
    user.name = name.trim();
  }
  if (avatar && typeof avatar === "string") {
    user.avatar = avatar;
  }
  if (avatarSource) {
    user.avatarSource = avatarSource;
  }
  if (password && typeof password === "string") {
    user.password = password;
  }

  user.updatedAt = new Date().toISOString();
  data.updatedAt = new Date().toISOString();

  writeUserInfoData(data);
  res.json({ success: true, user });
});

// API: Delete profile
app.post("/api/userinfo/delete", (req, res) => {
  const { userId, password } = req.body;
  const data = readUserInfoData();

  if (!data || !data.users || !data.users[userId]) {
    return res.status(404).json({ error: "Profile not found." });
  }

  if (password && data.users[userId].password !== String(password)) {
    return res.status(401).json({ error: "Incorrect password to delete profile." });
  }

  delete data.users[userId];
  data.updatedAt = new Date().toISOString();

  writeUserInfoData(data);
  res.json({ success: true, remaining: Object.keys(data.users).length });
});

// API: View or download raw userinfo.json file
app.get("/api/userinfo/raw", (req, res) => {
  if (!fs.existsSync(USERINFO_FILE)) {
    return res.status(404).json({ error: "userinfo.json file does not exist yet." });
  }

  res.setHeader("Content-Disposition", "attachment; filename=\"userinfo.json\"");
  res.setHeader("Content-Type", "application/json");
  fs.createReadStream(USERINFO_FILE).pipe(res);
});

// Start Express and Vite server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PepFlick] Full-stack server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
