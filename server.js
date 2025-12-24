const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ===========================
// MIDDLEWARE
// ===========================

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===========================
// MONGODB CONFIGURATION
// ===========================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'bookLibrary';
const PORT = process.env.PORT || 3000;

let db;
let booksCollection;

// ===========================
// DATABASE CONNECTION
// ===========================

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключено к MongoDB');

    db = client.db(DB_NAME);
    booksCollection = db.collection('books');

    // Создаем индексы для оптимизации запросов
    await createIndexes();
    console.log('📇 Индексы созданы');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏸️  Закрытие соединения с MongoDB...');
      await client.close();
      console.log('✅ Соединение закрыто');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  await booksCollection.createIndex({ title: 1 });
  await booksCollection.createIndex({ author: 1 });
  await booksCollection.createIndex({ genre: 1 });
  await booksCollection.createIndex({ dateAdded: -1 });
}

// ===========================
// DATA VALIDATION
// ===========================

const VALID_GENRES = [
  'Фантастика', 'Детектив', 'Роман', 'Классика',
  'Научпоп', 'Фэнтези', 'Триллер', 'Биография',
  'История', 'Другое'
];

function validateBook(bookData, isUpdate = false) {
  const errors = [];

  // Обязательные поля (только при создании)
  if (!isUpdate) {
    if (!bookData.title?.trim()) {
      errors.push('Поле "title" обязательно');
    }
    if (!bookData.author?.trim()) {
      errors.push('Поле "author" обязательно');
    }
    if (!bookData.genre) {
      errors.push('Поле "genre" обязательно');
    }
  }

  // Валидация жанра
  if (bookData.genre && !VALID_GENRES.includes(bookData.genre)) {
    errors.push(`Жанр должен быть одним из: ${VALID_GENRES.join(', ')}`);
  }

  // Валидация года
  if (bookData.year !== undefined && bookData.year !== '') {
    const year = parseInt(bookData.year);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1000 || year > currentYear) {
      errors.push(`Год должен быть между 1000 и ${currentYear}`);
    }
  }

  // Валидация рейтинга
  if (bookData.rating !== undefined) {
    const rating = parseFloat(bookData.rating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      errors.push('Рейтинг должен быть между 0 и 5');
    }
  }

  return errors;
}

// ===========================
// DATA PREPARATION
// ===========================

function prepareBookData(bookData, isUpdate = false) {
  const prepared = {};

  // Строковые поля (с trim)
  const stringFields = ['title', 'author', 'description', 'notes', 'coverUrl'];
  stringFields.forEach(field => {
    if (bookData[field] !== undefined) {
      prepared[field] = bookData[field].trim();
    }
  });

  // Жанр (без trim, так как из выпадающего списка)
  if (bookData.genre !== undefined) {
    prepared.genre = bookData.genre;
  }

  // Числовые поля
  if (bookData.year !== undefined && bookData.year !== '') {
    prepared.year = parseInt(bookData.year);
  }
  if (bookData.rating !== undefined) {
    prepared.rating = parseFloat(bookData.rating) || 0;
  }

  // Boolean поля
  if (bookData.isRead !== undefined) {
    prepared.isRead = Boolean(bookData.isRead);
  } else if (!isUpdate) {
    prepared.isRead = false;
  }

  // Дата добавления (только для новых документов)
  if (!isUpdate) {
    prepared.dateAdded = new Date();
  }

  return prepared;
}

// ===========================
// HELPER FUNCTIONS
// ===========================

function isValidObjectId(id) {
  return ObjectId.isValid(id);
}

function sendError(res, status, message, error = null) {
  const response = { message };
  if (error) {
    response.error = error.message || error;
  }
  res.status(status).json(response);
}

// ===========================
// API ROUTES
// ===========================

/**
 * GET /api/books
 * Получить все книги с фильтрацией и сортировкой
 * Query params: genre, isRead, sortBy
 */
app.get('/api/books', async (req, res) => {
  try {
    const { genre, isRead, sortBy } = req.query;
    const query = {};

    // Фильтрация
    if (genre && genre !== 'all') {
      query.genre = genre;
    }
    if (isRead !== undefined && isRead !== 'all') {
      query.isRead = isRead === 'true';
    }

    // Сортировка
    const sortOptions = {
      title: { title: 1 },
      author: { author: 1 },
      year: { year: -1 },
      rating: { rating: -1 },
      default: { dateAdded: -1 }
    };
    const sort = sortOptions[sortBy] || sortOptions.default;

    // Выполнение запроса
    const books = await booksCollection
      .find(query)
      .sort(sort)
      .toArray();

    res.json(books);
  } catch (error) {
    console.error('Ошибка при получении книг:', error);
    sendError(res, 500, 'Ошибка при получении книг', error);
  }
});

/**
 * GET /api/books/:id
 * Получить одну книгу по ID
 */
app.get('/api/books/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Неверный формат ID');
    }

    const book = await booksCollection.findOne({
      _id: new ObjectId(req.params.id)
    });

    if (!book) {
      return sendError(res, 404, 'Книга не найдена');
    }

    res.json(book);
  } catch (error) {
    console.error('Ошибка при получении книги:', error);
    sendError(res, 500, 'Ошибка при получении книги', error);
  }
});

/**
 * POST /api/books
 * Создать новую книгу
 */
app.post('/api/books', async (req, res) => {
  try {
    // Валидация
    const errors = validateBook(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors
      });
    }

    // Подготовка данных
    const bookData = prepareBookData(req.body);

    // Вставка в БД
    const result = await booksCollection.insertOne(bookData);

    // Получаем созданный документ
    const newBook = await booksCollection.findOne({
      _id: result.insertedId
    });

    res.status(201).json(newBook);
  } catch (error) {
    console.error('Ошибка при создании книги:', error);
    sendError(res, 400, 'Ошибка при создании книги', error);
  }
});

/**
 * PUT /api/books/:id
 * Обновить книгу
 */
app.put('/api/books/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Неверный формат ID');
    }

    // Валидация
    const errors = validateBook(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Ошибка валидации',
        errors
      });
    }

    // Подготовка данных
    const updateData = prepareBookData(req.body, true);

    // Обновление в БД
    const result = await booksCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return sendError(res, 404, 'Книга не найдена');
    }

    res.json(result.value);
  } catch (error) {
    console.error('Ошибка при обновлении книги:', error);
    sendError(res, 400, 'Ошибка при обновлении книги', error);
  }
});

/**
 * DELETE /api/books/:id
 * Удалить книгу
 */
app.delete('/api/books/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Неверный формат ID');
    }

    const result = await booksCollection.findOneAndDelete({
      _id: new ObjectId(req.params.id)
    });

    if (!result.value) {
      return sendError(res, 404, 'Книга не найдена');
    }

    res.json({
      message: 'Книга успешно удалена',
      book: result.value
    });
  } catch (error) {
    console.error('Ошибка при удалении книги:', error);
    sendError(res, 500, 'Ошибка при удалении книги', error);
  }
});

/**
 * GET /api/stats
 * Получить статистику библиотеки
 */
app.get('/api/stats', async (req, res) => {
  try {
    // Параллельное выполнение запросов для оптимизации
    const [totalBooks, readBooks, unreadBooks, avgRatingResult] = await Promise.all([
      booksCollection.countDocuments(),
      booksCollection.countDocuments({ isRead: true }),
      booksCollection.countDocuments({ isRead: false }),
      booksCollection.aggregate([
        { $match: { rating: { $gt: 0 } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]).toArray()
    ]);

    const averageRating = avgRatingResult.length > 0
      ? avgRatingResult[0].avgRating.toFixed(1)
      : 0;

    res.json({
      total: totalBooks,
      read: readBooks,
      unread: unreadBooks,
      averageRating
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    sendError(res, 500, 'Ошибка при получении статистики', error);
  }
});

// ===========================
// STATIC FILES & FALLBACK
// ===========================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===========================
// SERVER START
// ===========================

async function startServer() {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📂 База данных: ${DB_NAME}`);
    console.log(`🌐 API доступен по адресу: http://localhost:${PORT}/api/books`);
  });
}

startServer();
