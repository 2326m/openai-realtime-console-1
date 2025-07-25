import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
const defaultVoice = process.env.VOICE || "sage";

app.use(express.json());

// simple persistent store for conversation summaries
const DATA_FILE = "./user-data.json";
let userData = { summaries: [] };
try {
  if (fs.existsSync(DATA_FILE)) {
    userData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
} catch (e) {
  console.error("Failed to load user data", e);
}

function saveUserData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2));
  } catch (e) {
    console.error("Failed to save user data", e);
  }
}

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// expose persisted user data
app.get("/userdata", (req, res) => {
  res.json(userData);
});

app.post("/userdata", (req, res) => {
  const { summary } = req.body;
  if (!summary) {
    return res.status(400).json({ error: "No summary provided" });
  }
  userData.summaries.push({ summary, timestamp: new Date().toISOString() });
  saveUserData();
  res.status(201).json({ ok: true });
});

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const voice = req.query.voice || defaultVoice;
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice,
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
