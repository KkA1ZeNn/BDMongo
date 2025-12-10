const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bookLibrary';
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Подключено к MongoDB'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// Book Schema and Model
const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  genre: {
    type: String,
    required: true,
    enum: ['Фантастика', 'Детектив', 'Роман', 'Классика', 'Научпоп', 'Фэнтези', 'Триллер', 'Биография', 'История', 'Другое']
  },
  year: {
    type: Number,
    min: 1000,
    max: new Date().getFullYear()
  },
  description: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  coverUrl: {
    type: String,
    trim: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
});

const Book = mongoose.model('Book', bookSchema);

// API Routes

// Получить все книги
app.get('/api/books', async (req, res) => {
  try {
    const { genre, isRead, sortBy } = req.query;
    let query = {};
    
    if (genre && genre !== 'all') {
      query.genre = genre;
    }
    
    if (isRead !== undefined && isRead !== 'all') {
      query.isRead = isRead === 'true';
    }
    
    let books = Book.find(query);
    
    // Сортировка
    if (sortBy === 'title') {
      books = books.sort({ title: 1 });
    } else if (sortBy === 'author') {
      books = books.sort({ author: 1 });
    } else if (sortBy === 'year') {
      books = books.sort({ year: -1 });
    } else if (sortBy === 'rating') {
      books = books.sort({ rating: -1 });
    } else {
      books = books.sort({ dateAdded: -1 });
    }
    
    const result = await books;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении книг', error: error.message });
  }
});

// Получить одну книгу по ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Книга не найдена' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении книги', error: error.message });
  }
});

// Создать новую книгу
app.post('/api/books', async (req, res) => {
  try {
    const book = new Book(req.body);
    const savedBook = await book.save();
    res.status(201).json(savedBook);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при создании книги', error: error.message });
  }
});

// Обновить книгу
app.put('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Книга не найдена' });
    }
    res.json(book);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при обновлении книги', error: error.message });
  }
});

// Удалить книгу
app.delete('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Книга не найдена' });
    }
    res.json({ message: 'Книга успешно удалена', book });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при удалении книги', error: error.message });
  }
});

// Получить статистику
app.get('/api/stats', async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const readBooks = await Book.countDocuments({ isRead: true });
    const unreadBooks = await Book.countDocuments({ isRead: false });
    const averageRating = await Book.aggregate([
      { $match: { rating: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    res.json({
      total: totalBooks,
      read: readBooks,
      unread: unreadBooks,
      averageRating: averageRating.length > 0 ? averageRating[0].avgRating.toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении статистики', error: error.message });
  }
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});

