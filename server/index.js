import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import serverRoutes from './routes/serverRoutes.js';
import dmRoutes from './routes/dmRoutes.js';
import { setupSocketHandlers } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Konfiguracja CORS dla Socket.io i Express
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Trasy API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/dm', dmRoutes);

// Endpoint testowy / status serwera
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Obsługa Socket.io
setupSocketHandlers(io);

// Serwowanie plików produkcyjnych frontendu jeśli istnieją
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      // Jeśli aplikacja działa w trybie deweloperskim Vite
      res.status(200).send('VoiceChat Backend API is running on port 3001. Start Vite frontend with "npm run client" or use dev mode.');
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Serwer VoiceChat działa na porcie http://localhost:${PORT}`);
  console.log(`📡 Socket.io i WebRTC sygnalizacja gotowe do połączeń`);
  console.log(`====================================================`);
});
