// API Base URL
const API_URL = '/api';

// State
let books = [];
let currentBookId = null;
let currentFilters = {
    genre: 'all',
    isRead: 'all',
    sortBy: 'dateAdded'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadStats();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('addBookBtn').addEventListener('click', openAddBookModal);
    document.getElementById('bookForm').addEventListener('submit', handleBookSubmit);
    document.getElementById('genreFilter').addEventListener('change', handleFilterChange);
    document.getElementById('statusFilter').addEventListener('change', handleFilterChange);
    document.getElementById('sortBy').addEventListener('change', handleFilterChange);
    
    // Rating stars
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', handleRatingClick);
        star.addEventListener('mouseenter', handleRatingHover);
    });
    
    document.querySelector('.rating-input').addEventListener('mouseleave', () => {
        updateRatingDisplay(parseInt(document.getElementById('rating').value));
    });
}

// API Functions
async function loadBooks() {
    try {
        const params = new URLSearchParams(currentFilters);
        const response = await fetch(`${API_URL}/books?${params}`);
        if (!response.ok) throw new Error('Ошибка загрузки книг');
        
        books = await response.json();
        renderBooks();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при загрузке книг', 'error');
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        if (!response.ok) throw new Error('Ошибка загрузки статистики');
        
        const stats = await response.json();
        document.getElementById('totalBooks').textContent = stats.total;
        document.getElementById('readBooks').textContent = stats.read;
        document.getElementById('unreadBooks').textContent = stats.unread;
        document.getElementById('avgRating').textContent = stats.averageRating;
        
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function createBook(bookData) {
    try {
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });
        
        if (!response.ok) throw new Error('Ошибка создания книги');
        
        showNotification('Книга успешно добавлена!', 'success');
        loadBooks();
        loadStats();
        closeModal();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при добавлении книги', 'error');
    }
}

async function updateBook(id, bookData) {
    try {
        const response = await fetch(`${API_URL}/books/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });
        
        if (!response.ok) throw new Error('Ошибка обновления книги');
        
        showNotification('Книга успешно обновлена!', 'success');
        loadBooks();
        loadStats();
        closeModal();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при обновлении книги', 'error');
    }
}

async function deleteBook(id) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) return;
    
    try {
        const response = await fetch(`${API_URL}/books/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Ошибка удаления книги');
        
        showNotification('Книга успешно удалена!', 'success');
        loadBooks();
        loadStats();
        closeViewModal();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при удалении книги', 'error');
    }
}

// Render Functions
function renderBooks() {
    const grid = document.getElementById('booksGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (books.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    grid.innerHTML = books.map(book => `
        <div class="book-card" onclick="viewBook('${book._id}')">
            <img class="book-cover" 
                 src="${book.coverUrl || 'https://via.placeholder.com/280x320?text=' + encodeURIComponent(book.title)}" 
                 alt="${book.title}"
                 onerror="this.src='https://via.placeholder.com/280x320?text=No+Cover'">
            <div class="book-content">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">Автор: ${book.author}</p>
                <div class="book-meta">
                    <span class="genre-badge">${book.genre}</span>
                    ${book.year ? `<span class="year-badge">${book.year}</span>` : ''}
                </div>
                <div class="book-status">
                    <span class="status-badge ${book.isRead ? 'status-read' : 'status-unread'}">
                        ${book.isRead ? '✓ Прочитана' : '⏳ Не прочитана'}
                    </span>
                </div>
                ${book.rating > 0 ? `<div class="book-rating">${getStars(book.rating)}</div>` : ''}
                ${book.description ? `<p class="book-description">${book.description}</p>` : ''}
                <div class="book-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-primary btn-small" onclick="editBook('${book._id}')">Редактировать</button>
                    <button class="btn btn-danger btn-small" onclick="deleteBook('${book._id}')">Удалить</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getStars(rating) {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
}

// Modal Functions
function openAddBookModal() {
    document.getElementById('modalTitle').textContent = 'Добавить книгу';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = '';
    currentBookId = null;
    updateRatingDisplay(0);
    document.getElementById('bookModal').classList.add('active');
}

function editBook(id) {
    const book = books.find(b => b._id === id);
    if (!book) return;
    
    document.getElementById('modalTitle').textContent = 'Редактировать книгу';
    document.getElementById('bookId').value = book._id;
    document.getElementById('title').value = book.title;
    document.getElementById('author').value = book.author;
    document.getElementById('genre').value = book.genre;
    document.getElementById('year').value = book.year || '';
    document.getElementById('description').value = book.description || '';
    document.getElementById('isRead').checked = book.isRead;
    document.getElementById('rating').value = book.rating || 0;
    document.getElementById('notes').value = book.notes || '';
    document.getElementById('coverUrl').value = book.coverUrl || '';
    
    updateRatingDisplay(book.rating || 0);
    currentBookId = book._id;
    document.getElementById('bookModal').classList.add('active');
}

function viewBook(id) {
    const book = books.find(b => b._id === id);
    if (!book) return;
    
    currentBookId = book._id;
    
    document.getElementById('viewTitle').textContent = book.title;
    document.getElementById('viewAuthor').textContent = book.author;
    document.getElementById('viewGenre').textContent = book.genre;
    document.getElementById('viewYear').textContent = book.year || 'Не указан';
    document.getElementById('viewStatus').innerHTML = `
        <span class="status-badge ${book.isRead ? 'status-read' : 'status-unread'}">
            ${book.isRead ? '✓ Прочитана' : '⏳ Не прочитана'}
        </span>
    `;
    document.getElementById('viewRatingStars').innerHTML = book.rating > 0 ? getStars(book.rating) : 'Нет рейтинга';
    document.getElementById('viewDescription').textContent = book.description || 'Описание отсутствует';
    
    const notesSection = document.getElementById('viewNotesSection');
    if (book.notes) {
        notesSection.style.display = 'block';
        document.getElementById('viewNotes').textContent = book.notes;
    } else {
        notesSection.style.display = 'none';
    }
    
    const coverImg = document.getElementById('viewCover');
    coverImg.src = book.coverUrl || `https://via.placeholder.com/200x300?text=${encodeURIComponent(book.title)}`;
    
    document.getElementById('viewBookModal').classList.add('active');
}

function editBookFromView() {
    closeViewModal();
    editBook(currentBookId);
}

function deleteBookFromView() {
    deleteBook(currentBookId);
}

function closeModal() {
    document.getElementById('bookModal').classList.remove('active');
    currentBookId = null;
}

function closeViewModal() {
    document.getElementById('viewBookModal').classList.remove('active');
    currentBookId = null;
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    const bookModal = document.getElementById('bookModal');
    const viewModal = document.getElementById('viewBookModal');
    
    if (e.target === bookModal) {
        closeModal();
    }
    if (e.target === viewModal) {
        closeViewModal();
    }
});

// Form Submit Handler
function handleBookSubmit(e) {
    e.preventDefault();
    
    const bookData = {
        title: document.getElementById('title').value.trim(),
        author: document.getElementById('author').value.trim(),
        genre: document.getElementById('genre').value,
        year: document.getElementById('year').value ? parseInt(document.getElementById('year').value) : undefined,
        description: document.getElementById('description').value.trim(),
        isRead: document.getElementById('isRead').checked,
        rating: parseInt(document.getElementById('rating').value),
        notes: document.getElementById('notes').value.trim(),
        coverUrl: document.getElementById('coverUrl').value.trim()
    };
    
    const bookId = document.getElementById('bookId').value;
    
    if (bookId) {
        updateBook(bookId, bookData);
    } else {
        createBook(bookData);
    }
}

// Filter Handler
function handleFilterChange(e) {
    const filterId = e.target.id;
    
    if (filterId === 'genreFilter') {
        currentFilters.genre = e.target.value;
    } else if (filterId === 'statusFilter') {
        currentFilters.isRead = e.target.value;
    } else if (filterId === 'sortBy') {
        currentFilters.sortBy = e.target.value;
    }
    
    loadBooks();
}

// Rating Functions
function handleRatingClick(e) {
    const value = parseInt(e.target.dataset.value);
    document.getElementById('rating').value = value;
    updateRatingDisplay(value);
}

function handleRatingHover(e) {
    const value = parseInt(e.target.dataset.value);
    updateRatingDisplay(value);
}

function updateRatingDisplay(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
            star.textContent = '★';
        } else {
            star.classList.remove('active');
            star.textContent = '☆';
        }
    });
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

