require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // <-- added

// routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');

const app = express();
const server = http.createServer(app);

// middlewares
app.use(cors());
app.use(express.json());

// ---------- serve frontend static files (images, css, index.html) ----------
/*
  Assumes your frontend lives at project_root/frontend
  and assets are at frontend/assets/...
  Adjust the path.join if your layout differs.
*/
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
// -------------------------------------------------------------------------

// mount API
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// If request doesn't match /api/* and isn't a static file, serve index.html (SPA-friendly)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(frontendPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) next();
  });
});

// Socket.IO setup
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET","POST","PATCH","PUT","DELETE"],
  }
});

// simple auth on socket handshake using token in auth object
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(); // anonymous allowed
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
  } catch (err) {
    // invalid token: proceed as anonymous
  }
  next();
});

io.on('connection', (socket) => {
  if (socket.userId) {
    const room = `user:${socket.userId}`;
    socket.join(room);
    // optional: console log
    console.log('Socket connected', socket.id, 'user', socket.userId);
  }
  socket.on('disconnect', ()=>{});
});

// export io for controllers
module.exports.io = io;

// start
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('MongoDB connected');
    server.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });
