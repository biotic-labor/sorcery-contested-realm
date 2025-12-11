import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import curiosaRoutes from './routes/curiosa.js';
import gamesRoutes from './routes/games.js';
import { cleanupOldGames, cleanupStalePublicGames, cleanupStaleActiveGames } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

// API routes
app.use('/api/curiosa', curiosaRoutes);
app.use('/api', gamesRoutes);

// Cleanup old games on startup and every minute
cleanupOldGames();
cleanupStalePublicGames();
cleanupStaleActiveGames();
setInterval(() => {
  const deleted = cleanupOldGames();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} old game(s)`);
  }
  const stale = cleanupStalePublicGames();
  if (stale > 0) {
    console.log(`Cleaned up ${stale} stale public game(s)`);
  }
  const abandoned = cleanupStaleActiveGames();
  if (abandoned > 0) {
    console.log(`Marked ${abandoned} abandoned game(s) as finished`);
  }
}, 60 * 1000); // Run every minute

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In production, serve static files from the dist folder
if (NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // SPA fallback: serve index.html for all non-API routes
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${NODE_ENV})`);
});
