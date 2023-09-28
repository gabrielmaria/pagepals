const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth, redirectHome } = require('../controllers/middleware');
const authController = require('../controllers/auth');
const profileController = require('../controllers/profile');
const {
  searchBooks,
  addToFavorites,
  addToWishlist,
  getFavorites,
  getWishlist,
  getBookshelf,
  removeFromFavorites,
  removeFromWishlist,
  removeFromReading,
  updateBookNotes,
  moveBook,
} = require('../controllers/books');
const superuserController = require('../controllers/superuser');
const generatePDF = require('../controllers/generatePDF');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', redirectHome, (req, res) => {
  res.render('index');
});

router.get('/register', redirectHome, (req, res) => {
  res.render('register');
});

router.get('/login', redirectHome, (req, res) => {
  res.render('login');
});

router.get('/logout', authController.logout);

router.get('/superuser', requireAuth, superuserController.superuser);

router.get('/home', requireAuth, (req, res) => {
  res.render('home');
});

router.get('/profile', requireAuth, profileController.getProfile);
router.post('/profile', requireAuth, profileController.updateProfile);

router.get('/books', requireAuth, (req, res) => {
  res.render('books', { books: [] });
});

router.get('/books/search', requireAuth, (req, res) => {
  searchBooks(req, res);
});

router.post('/books/add-to-favorites/:bookId', requireAuth, (req, res) => {
  addToFavorites(req, res, req.user.id);
});

router.post('/books/add-to-wishlist', requireAuth, (req, res) => {
  addToWishlist(req, res, req.user.id);
});

router.get('/favorites', requireAuth, (req, res) => {
  getFavorites(req, res);
});

router.get('/wishlist', requireAuth, (req, res) => {
  getWishlist(req, res);
});



router.get('/bookshelf', requireAuth, (req, res, next) => {
  getBookshelf(req, res, next);
}, (req, res) => {
  const readingBooks = req.readingBooks.map((book) => {
    const { id, title, author, thumbnail } = book;
    const notes = req.notes[id] || [];

    return { id, title, author, thumbnail, notes };
  });

  console.log('Notes:', req.notes);

  res.render('bookshelf', {
    title: 'Bookshelf',
    reading: readingBooks,
    favorites: req.favoriteBooks,
    wishlist: req.wishlistBooks,
    notes: req.notes
  });
});



router.post('/bookshelf/favorites/remove/:bookId', requireAuth, (req, res) => {
  removeFromFavorites(req, res, req.user.id);
});

router.post('/bookshelf/favorites/move-to-wishlist/:bookId', requireAuth, (req, res) => {
  moveBook(req, res, req.user.id, 'favorites', 'wishlist');
});

router.post('/bookshelf/wishlist/remove/:bookId', requireAuth, (req, res) => {
  removeFromWishlist(req, res, req.user.id);
});

router.post('/bookshelf/wishlist/move-to-favorites/:bookId', requireAuth, (req, res) => {
  moveBook(req, res, req.user.id, 'wishlist', 'favorites');
});

router.post('/bookshelf/reading/move-to-favorites/:bookId', requireAuth, (req, res) => {
  moveBook(req, res, req.user.id, 'reading', 'favorites');
});

router.post('/reading/add', requireAuth, function(req, res) {
  const bookId = req.body.bookId; 
  const userId = req.session.userId;

  books.addBookToReading(userId, bookId, function(err, result) {
    if (err) {
      res.status(500).send('Error adding book to reading');
    } else {
      res.redirect('/bookshelf');
    }
  });
});

router.post('/bookshelf/reading/remove/:bookId', requireAuth, (req, res) => {
  removeFromReading(req, res, req.user.id);
});

router.post('/bookshelf/update-notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.id;

  updateBookNotes(id, notes, userId)
    .then(() => {
      res.redirect('/bookshelf');
    })
    .catch((error) => {
      console.error('Error updating book notes:', error);
      res.redirect('/bookshelf');
    });
});

router.post('/bookshelf/favorites/move-to-reading/:bookId', requireAuth, (req, res) => {
  const bookId = req.params.bookId;
  const userId = req.user.id;

  moveBook(req, res, userId, 'favorites', 'reading');
});

router.post('/bookshelf/wishlist/move-to-reading/:bookId', requireAuth, (req, res) => {
  const bookId = req.params.bookId;
  const userId = req.user.id;

  moveBook(req, res, userId, 'wishlist', 'reading');
});

router.get('/generate-pdf', requireAuth, generatePDF.generatePDF);

module.exports = router;
