import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========== Middleware Auth ==========
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token tidak ada' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token tidak valid' });
  }
};

// ========== Auth Routes ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        username,
        email,
        password: hashed,
        status: null,
      },
    });

    // Tambah kategori default
    await prisma.category.createMany({
      data: [
        { name: 'Umum', userEmail: email },
        { name: 'Penting', userEmail: email },
      ],
    });

    res.json({ success: true, message: 'Registrasi berhasil' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Email tidak ditemukan' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Password salah' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        pic: user.profilePic,
        status: user.status,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== User Profile ==========
app.get('/api/user/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
      select: { username: true, email: true, profilePic: true, status: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/profile-pic', authenticate, async (req, res) => {
  try {
    const { dataUrl } = req.body; // base64 image
    await prisma.user.update({
      where: { email: req.user.email },
      data: { profilePic: dataUrl },
    });
    res.json({ success: true, url: dataUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== Categories ==========
app.get('/api/categories', authenticate, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userEmail: req.user.email },
      select: { id: true, name: true },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await prisma.category.findUnique({
      where: { userEmail_name: { userEmail: req.user.email, name } },
    });
    if (existing) return res.status(400).json({ success: false, message: 'Kategori sudah ada' });

    const category = await prisma.category.create({
      data: {
        id: uuidv4(),
        name,
        userEmail: req.user.email,
      },
    });
    res.json({ success: true, id: category.id, name: category.name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ========== Archives ==========
app.post('/api/archives/upload', authenticate, async (req, res) => {
  try {
    const { fileName, customName, mimeType, base64, category, year } = req.body;

    // Upload ke Vercel Blob
    const blob = await put(fileName, Buffer.from(base64, 'base64'), {
      access: 'public',
      contentType: mimeType,
    });

    const previewUrl = blob.url;
    const downloadUrl = blob.url; // atau bisa ditambahkan ?download=1

    const archive = await prisma.archive.create({
      data: {
        id: uuidv4(),
        userEmail: req.user.email,
        fileName,
        customName,
        category,
        year,
        uploadDate: new Date(),
        driveUrl: previewUrl,
        downloadUrl,
        fileId: blob.url,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/archives', authenticate, async (req, res) => {
  try {
    const archives = await prisma.archive.findMany({
      where: { userEmail: req.user.email },
      orderBy: { uploadDate: 'desc' },
      select: {
        id: true,
        customName: true,
        uploadDate: true,
        year: true,
        category: true,
        driveUrl: true,
        downloadUrl: true,
      },
    });
    // Format ulang agar sesuai dengan frontend lama
    const formatted = archives.map((a, idx) => ({
      id: a.id,
      fileName: a.customName,
      date: a.uploadDate.toLocaleDateString('id-ID'),
      year: a.year,
      category: a.category,
      previewUrl: a.driveUrl,
      downloadUrl: a.downloadUrl,
      rowIndex: idx + 1, // hanya untuk keperluan frontend
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/archives/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, category, year } = req.body;
    await prisma.archive.update({
      where: { id, userEmail: req.user.email },
      data: { customName: fileName, category, year },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/archives/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Hapus dari DB (blob tidak dihapus otomatis, opsional)
    await prisma.archive.delete({
      where: { id, userEmail: req.user.email },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend statis (fallback untuk SPA)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

export default app;