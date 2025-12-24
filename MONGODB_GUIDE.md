# 🗄️ MongoDB: Руководство по работе с базой данных

> Полное руководство по работе с MongoDB в проекте "Моя Библиотека"

---

## 📑 Содержание

1. [Подключение к MongoDB](#подключение-к-mongodb)
2. [CRUD операции](#crud-операции)
3. [Запросы в проекте](#запросы-в-проекте)
4. [MongoDB операторы](#mongodb-операторы)
5. [Агрегация](#агрегация)
6. [Индексы](#индексы)
7. [Примеры запросов](#примеры-запросов)
8. [Лучшие практики](#лучшие-практики)

---

## 🔌 Подключение к MongoDB

### Импорт и настройка

```javascript
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'bookLibrary';

const client = new MongoClient(MONGODB_URI);
```

### Подключение к базе данных

```javascript
async function connectToMongoDB() {
  await client.connect();
  console.log('✅ Подключено к MongoDB');
  
  const db = client.db(DB_NAME);
  const booksCollection = db.collection('books');
  
  return { db, booksCollection };
}
```

### Закрытие соединения

```javascript
process.on('SIGINT', async () => {
  await client.close();
  console.log('✅ Соединение закрыто');
  process.exit(0);
});
```

---

## 📚 CRUD операции

### CREATE - Создание документов

#### insertOne() - Вставить один документ

```javascript
const result = await booksCollection.insertOne({
  title: "1984",
  author: "Джордж Оруэлл",
  genre: "Классика",
  year: 1949,
  isRead: true,
  rating: 5,
  dateAdded: new Date()
});

console.log(result.insertedId);  // ObjectId нового документа
```

#### insertMany() - Вставить несколько документов

```javascript
const result = await booksCollection.insertMany([
  { title: "Книга 1", author: "Автор 1", genre: "Фантастика" },
  { title: "Книга 2", author: "Автор 2", genre: "Детектив" }
]);

console.log(result.insertedCount);  // Количество вставленных
```

---

### READ - Чтение документов

#### find() - Найти документы

```javascript
// Все документы
const books = await booksCollection.find().toArray();

// С фильтром
const books = await booksCollection
  .find({ genre: "Фантастика" })
  .toArray();

// С несколькими условиями
const books = await booksCollection
  .find({ 
    genre: "Фантастика",
    isRead: true,
    rating: { $gte: 4 }
  })
  .toArray();

// С сортировкой
const books = await booksCollection
  .find({ genre: "Фантастика" })
  .sort({ rating: -1 })  // -1 = убывание, 1 = возрастание
  .toArray();

// С лимитом и пропуском (пагинация)
const books = await booksCollection
  .find()
  .sort({ dateAdded: -1 })
  .skip(20)   // Пропустить первые 20
  .limit(10)  // Взять следующие 10
  .toArray();

// Выбор конкретных полей
const books = await booksCollection
  .find()
  .project({ title: 1, author: 1, rating: 1 })
  .toArray();
```

#### findOne() - Найти один документ

```javascript
// По ID
const book = await booksCollection.findOne({ 
  _id: new ObjectId(id) 
});

// По другим полям
const book = await booksCollection.findOne({ 
  title: "1984" 
});

// С условиями
const book = await booksCollection.findOne({ 
  genre: "Фантастика",
  rating: { $gte: 4 }
});
```

#### countDocuments() - Подсчет

```javascript
// Все документы
const total = await booksCollection.countDocuments();

// С фильтром
const readBooks = await booksCollection.countDocuments({ 
  isRead: true 
});
```

---

### UPDATE - Обновление документов

#### updateOne() - Обновить один документ

```javascript
const result = await booksCollection.updateOne(
  { _id: new ObjectId(id) },           // Фильтр
  { $set: { rating: 5, isRead: true } } // Обновления
);

console.log(result.modifiedCount);  // Количество измененных
```

#### updateMany() - Обновить несколько документов

```javascript
const result = await booksCollection.updateMany(
  { genre: "Фантастика" },
  { $set: { isPopular: true } }
);

console.log(result.modifiedCount);
```

#### findOneAndUpdate() - Найти и обновить

```javascript
const result = await booksCollection.findOneAndUpdate(
  { _id: new ObjectId(id) },
  { $set: { rating: 5, isRead: true } },
  { returnDocument: 'after' }  // Вернуть обновленный документ
);

console.log(result.value);  // Обновленный документ
```

---

### DELETE - Удаление документов

#### deleteOne() - Удалить один документ

```javascript
const result = await booksCollection.deleteOne({ 
  _id: new ObjectId(id) 
});

console.log(result.deletedCount);  // 0 или 1
```

#### deleteMany() - Удалить несколько документов

```javascript
const result = await booksCollection.deleteMany({ 
  isRead: false 
});

console.log(result.deletedCount);
```

#### findOneAndDelete() - Найти и удалить

```javascript
const result = await booksCollection.findOneAndDelete({ 
  _id: new ObjectId(id) 
});

console.log(result.value);  // Удаленный документ
```

---

## 🎯 Запросы используемые в проекте

### 1. Получение всех книг с фильтрацией

```javascript
// GET /api/books?genre=Фантастика&isRead=true&sortBy=rating
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
```

### 2. Получение книги по ID

```javascript
// GET /api/books/:id
if (!ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ message: 'Неверный формат ID' });
}

const book = await booksCollection.findOne({
  _id: new ObjectId(req.params.id)
});
```

### 3. Создание новой книги

```javascript
// POST /api/books
const bookData = {
  title: "1984",
  author: "Джордж Оруэлл",
  genre: "Классика",
  year: 1949,
  isRead: true,
  rating: 5,
  dateAdded: new Date()
};

const result = await booksCollection.insertOne(bookData);
const newBook = await booksCollection.findOne({
  _id: result.insertedId
});
```

### 4. Обновление книги

```javascript
// PUT /api/books/:id
const result = await booksCollection.findOneAndUpdate(
  { _id: new ObjectId(req.params.id) },
  { $set: updateData },
  { returnDocument: 'after' }
);
```

### 5. Удаление книги

```javascript
// DELETE /api/books/:id
const result = await booksCollection.findOneAndDelete({
  _id: new ObjectId(req.params.id)
});
```

### 6. Статистика

```javascript
// GET /api/stats
const [totalBooks, readBooks, unreadBooks, avgRatingResult] = await Promise.all([
  booksCollection.countDocuments(),
  booksCollection.countDocuments({ isRead: true }),
  booksCollection.countDocuments({ isRead: false }),
  booksCollection.aggregate([
    { $match: { rating: { $gt: 0 } } },
    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
  ]).toArray()
]);
```

---

## 🔍 MongoDB операторы

### Операторы сравнения

```javascript
// $eq - равно
{ rating: 5 }
{ rating: { $eq: 5 } }

// $ne - не равно
{ rating: { $ne: 0 } }

// $gt - больше
{ rating: { $gt: 4 } }

// $gte - больше или равно
{ rating: { $gte: 4 } }

// $lt - меньше
{ year: { $lt: 2000 } }

// $lte - меньше или равно
{ year: { $lte: 2000 } }

// $in - входит в массив
{ genre: { $in: ["Фантастика", "Фэнтези"] } }

// $nin - не входит в массив
{ genre: { $nin: ["Детектив", "Триллер"] } }
```

### Логические операторы

```javascript
// $and - И
{
  $and: [
    { genre: "Фантастика" },
    { rating: { $gte: 4 } },
    { isRead: true }
  ]
}

// $or - ИЛИ
{
  $or: [
    { genre: "Фантастика" },
    { genre: "Фэнтези" }
  ]
}

// $not - НЕ
{ rating: { $not: { $lt: 3 } } }

// $nor - НИ один из
{
  $nor: [
    { isRead: true },
    { rating: { $lt: 3 } }
  ]
}
```

### Операторы обновления

```javascript
// $set - установить значение
{ $set: { rating: 5, isRead: true } }

// $unset - удалить поле
{ $unset: { notes: "" } }

// $inc - увеличить/уменьшить
{ $inc: { rating: 1 } }

// $mul - умножить
{ $mul: { price: 1.1 } }

// $min - установить если меньше
{ $min: { lowestPrice: 100 } }

// $max - установить если больше
{ $max: { highestRating: 5 } }

// $currentDate - текущая дата
{ $currentDate: { lastModified: true } }

// $push - добавить в массив
{ $push: { tags: "новый-тег" } }

// $pull - удалить из массива
{ $pull: { tags: "старый-тег" } }

// $addToSet - добавить уникальное значение
{ $addToSet: { tags: "тег" } }
```

---

## 📊 Агрегация (Aggregation)

Агрегация - мощный инструмент для сложных запросов и аналитики.

### Базовая агрегация

```javascript
const result = await booksCollection.aggregate([
  // Stage 1: Фильтрация
  { $match: { rating: { $gt: 0 } } },
  
  // Stage 2: Группировка
  { 
    $group: { 
      _id: null,
      avgRating: { $avg: '$rating' },
      maxRating: { $max: '$rating' },
      total: { $sum: 1 }
    } 
  }
]).toArray();
```

### Группировка по полю

```javascript
// Статистика по жанрам
const stats = await booksCollection.aggregate([
  {
    $group: {
      _id: '$genre',
      count: { $sum: 1 },
      avgRating: { $avg: '$rating' }
    }
  },
  { $sort: { avgRating: -1 } }
]).toArray();
```

### Сложная агрегация

```javascript
const topAuthors = await booksCollection.aggregate([
  // Группировка по автору
  {
    $group: {
      _id: '$author',
      bookCount: { $sum: 1 },
      avgRating: { $avg: '$rating' },
      books: { $push: '$title' }
    }
  },
  
  // Фильтрация
  { $match: { bookCount: { $gt: 2 } } },
  
  // Добавление вычисляемых полей
  {
    $project: {
      author: '$_id',
      bookCount: 1,
      avgRating: { $round: ['$avgRating', 2] },
      books: 1
    }
  },
  
  // Сортировка
  { $sort: { avgRating: -1 } },
  
  // Лимит
  { $limit: 10 }
]).toArray();
```

---

## 📇 Индексы для оптимизации

Индексы ускоряют поиск данных.

### Создание индексов

```javascript
// Простой индекс
await booksCollection.createIndex({ title: 1 });

// Составной индекс
await booksCollection.createIndex({ 
  genre: 1, 
  rating: -1 
});

// Уникальный индекс
await booksCollection.createIndex(
  { isbn: 1 },
  { unique: true }
);

// Текстовый индекс
await booksCollection.createIndex({
  title: 'text',
  description: 'text'
});
```

### Просмотр индексов

```javascript
// Список всех индексов
const indexes = await booksCollection.indexes();

// Удалить индекс
await booksCollection.dropIndex('title_1');
```

---

## 💡 Примеры запросов

### Поиск по тексту

```javascript
// Поиск по названию (регулярное выражение)
const books = await booksCollection.find({ 
  title: { $regex: /оруэлл/i }  // i = без учета регистра
}).toArray();

// Поиск по нескольким полям
const books = await booksCollection.find({
  $or: [
    { title: { $regex: /1984/i } },
    { author: { $regex: /оруэлл/i } }
  ]
}).toArray();
```

### Пагинация

```javascript
async function getBooksPaginated(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const books = await booksCollection
    .find()
    .sort({ dateAdded: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  const total = await booksCollection.countDocuments();
  
  return {
    books,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    total
  };
}
```

### Фильтрация с несколькими условиями

```javascript
// Книги за последние 5 лет с высоким рейтингом
const fiveYearsAgo = new Date().getFullYear() - 5;

const books = await booksCollection.find({
  genre: "Фантастика",
  rating: { $gte: 4 },
  isRead: true,
  year: { $gte: fiveYearsAgo }
}).sort({ rating: -1 }).toArray();
```

### Обновление нескольких документов

```javascript
// Пометить все старые книги как классику
const result = await booksCollection.updateMany(
  { year: { $lt: 1950 } },
  { 
    $set: { isClassic: true },
    $addToSet: { tags: 'классика' }
  }
);
```

---

## 🔑 Работа с ObjectId

**ObjectId** - уникальный идентификатор документа в MongoDB.

```javascript
const { ObjectId } = require('mongodb');

// Создание нового ObjectId
const id = new ObjectId();

// Преобразование строки в ObjectId
const id = new ObjectId("507f1f77bcf86cd799439011");

// Проверка валидности
if (ObjectId.isValid(idString)) {
  const book = await booksCollection.findOne({
    _id: new ObjectId(idString)
  });
}

// Получение timestamp
const timestamp = id.getTimestamp();
```

---

## ✅ Лучшие практики

### DO (Делайте так)

```javascript
// 1. Всегда используйте .toArray() после find()
const books = await booksCollection.find().toArray();

// 2. Проверяйте валидность ObjectId
if (ObjectId.isValid(id)) {
  await booksCollection.findOne({ _id: new ObjectId(id) });
}

// 3. Используйте индексы для частых запросов
await booksCollection.createIndex({ genre: 1 });

// 4. Ограничивайте результаты
await booksCollection.find().limit(100).toArray();

// 5. Используйте Promise.all для параллельных запросов
const [total, read] = await Promise.all([
  booksCollection.countDocuments(),
  booksCollection.countDocuments({ isRead: true })
]);

// 6. Выбирайте только нужные поля
await booksCollection
  .find()
  .project({ title: 1, author: 1 })
  .toArray();
```

### DON'T (Не делайте так)

```javascript
// 1. НЕ забывайте .toArray()
const books = await booksCollection.find();  // ❌ Вернет cursor!

// 2. НЕ передавайте строку вместо ObjectId
await booksCollection.findOne({ _id: id });  // ❌ Не найдет!

// 3. НЕ делайте запросы в циклах
for (const id of ids) {
  await booksCollection.findOne({ _id: new ObjectId(id) });  // ❌ МЕДЛЕННО!
}
// Лучше:
await booksCollection.find({ 
  _id: { $in: ids.map(id => new ObjectId(id)) } 
}).toArray();

// 4. НЕ забывайте закрывать соединение
await client.close();
```

---

## 🎯 Шпаргалка команд

```javascript
// ПОДКЛЮЧЕНИЕ
const client = new MongoClient(uri);
await client.connect();
const db = client.db('dbName');
const collection = db.collection('collectionName');

// CREATE
await collection.insertOne({...})
await collection.insertMany([...])

// READ
await collection.find().toArray()
await collection.findOne({ _id: new ObjectId(id) })
await collection.countDocuments()

// UPDATE
await collection.updateOne({ _id: ObjectId }, { $set: {...} })
await collection.updateMany({...}, { $set: {...} })
await collection.findOneAndUpdate({...}, { $set: {...} }, { returnDocument: 'after' })

// DELETE
await collection.deleteOne({ _id: ObjectId })
await collection.deleteMany({...})
await collection.findOneAndDelete({...})

// AGGREGATION
await collection.aggregate([...]).toArray()

// ИНДЕКСЫ
await collection.createIndex({ field: 1 })
await collection.indexes()

// ЗАКРЫТИЕ
await client.close()
```

---

## 🔗 Полезные ссылки

- [MongoDB Node.js Driver Documentation](https://www.mongodb.com/docs/drivers/node/current/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [MongoDB University](https://university.mongodb.com/) - бесплатные курсы

---

**Успешной работы с MongoDB!** 🚀

