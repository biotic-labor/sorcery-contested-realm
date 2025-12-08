import express from 'express';
import cors from 'cors';
import curiosaRoutes from './routes/curiosa.js';

const app = express();
const PORT = 3001;

// CORS configuration for Vite dev server
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());

// API routes
app.use('/api/curiosa', curiosaRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
