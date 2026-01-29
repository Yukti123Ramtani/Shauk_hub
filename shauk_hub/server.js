const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const socketIO = require('socket.io');
const http = require('http');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hobby_key_123';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // This serves your HTML files

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Database Schemas ---

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  hobby: { type: String, required: true },
  countryCode: { type: String, required: true },
  phone: { type: String, required: true },
  fullPhone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
  hobby: { type: String, required: true },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// --- Content Filtering Logic ---

const bannedWords = [
  'religious studies', 'islam', 'christianity', 'christ', 'god',
  'hinduism', 'sanatan', 'muslims', 'politics', 'religion'
];

const containsBannedWords = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return bannedWords.some(word => lowerText.includes(word));
};

// --- API Routes ---

// Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, hobby, countryCode, phone, fullPhone } = req.body;

    if (containsBannedWords(hobby)) {
      return res.status(400).json({ message: 'This hobby name contains restricted topics (Religion/Politics)' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name, email, password: hashedPassword, hobby, countryCode, phone, fullPhone
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { name: newUser.name, email: newUser.email, hobby: newUser.hobby }
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed server-side' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: { name: user.name, email: user.email, hobby: user.hobby }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login error' });
  }
});

// Get Chat History
app.get('/api/messages/:hobby', async (req, res) => {
  try {
    const messages = await Message.find({ hobby: req.params.hobby })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Could not load messages' });
  }
});

// --- Socket.IO (Real-time Chat) ---

const io = socketIO(server, {
  cors: {
    origin: "*", // Allows connection from any frontend port
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('👤 A user connected');

  socket.on('joinRoom', async (hobby) => {
    socket.join(hobby);
    console.log(`🏠 User joined room: ${hobby}`);

    // Load history when joining
    const messages = await Message.find({ hobby }).sort({ timestamp: 1 }).limit(50);
    socket.emit('previousMessages', messages);
  });

  socket.on('chatMessage', async (data) => {
    const { hobby, sender, text } = data;

    // Check banned words in live chat
    if (containsBannedWords(text)) {
      socket.emit('message', {
        sender: 'System',
        text: '⚠️ Your message was blocked because it contains restricted topics (Religion/Politics).',
        timestamp: new Date()
      });
      return;
    }

    const newMessage = new Message({ hobby, sender, text });
    await newMessage.save();

    io.to(hobby).emit('message', newMessage);
  });

  socket.on('disconnect', () => {
    console.log('👤 User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


