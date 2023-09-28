const axios = require('axios');
require('dotenv').config();
const { db } = require('../db');

const API_BASE_URL = 'https://www.googleapis.com/books/v1';
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

async function searchBooks(req, res) {
  const query = req.query.query;
  try {
    const response = await axios.get(`${API_BASE_URL}/volumes?q=${query}&key=${API_KEY}`);
    const books = response.data.items.map((item) => {
      const { id, volumeInfo } = item;
      const { title, authors, imageLinks } = volumeInfo;
      return {
        id,
        title,
        author: authors ? authors[0] : 'Unknown',
        thumbnail: imageLinks ? imageLinks.thumbnail : '',
      };
    });
    res.render('books', { books });
  } catch (error) {
    console.error('Error searching books:', error);
    res.render('books', { books: [] });
  }
}

async function addToFavorites(req, res, userId) {
  const { bookId } = req.params;

  const isBookInWishlist = await checkIfBookInWishlist(userId, bookId);
  const isBookInFavorites = await checkIfBookInFavorites(userId, bookId);
  if (isBookInWishlist) {
    const errorMessage = 'The book is already in your wishlist.';
    return res.render('books', { errorMessage });
  } else if (isBookInFavorites) {
    const errorMessage = 'The book is already in your favorites.';
    return res.render('books', { errorMessage });
  } else {
    try {
      db.query('INSERT INTO favorites (user_id, book_id) VALUES (?, ?)', [userId, bookId], (error, result) => {
        if (error) {
          console.error('Error adding book to favorites:', error);
          res.redirect('/books');
        } else {
          res.redirect('/bookshelf');
        }
      });
    } catch (error) {
      console.error('Error adding book to favorites:', error);
      res.redirect('/books');
    }
  }
}

async function removeFromFavorites(req, res, userId) {
  const { bookId } = req.params;

  try {
    db.query('DELETE FROM favorites WHERE user_id = ? AND book_id = ?', [userId, bookId], (error, result) => {
      if (error) {
        console.error('Error removing book from favorites:', error);
        res.redirect('/bookshelf');
      } else {
        res.redirect('/bookshelf');
      }
    });
  } catch (error) {
    console.error('Error removing book from favorites:', error);
    res.redirect('/bookshelf');
  }
}

async function addToWishlist(req, res, userId) {
  const { bookId } = req.body;

  const isBookInFavorites = await checkIfBookInFavorites(userId, bookId);
  const isBookInWishlist = await checkIfBookInWishlist(userId, bookId);
  if (isBookInFavorites) {
    const errorMessage = 'The book is already in your favorites.';
    return res.render('books', { errorMessage });
  } else if (isBookInWishlist) {
    const errorMessage = 'The book is already in your wishlist.';
    return res.render('books', { errorMessage });
  } else {
    try {
      db.query('INSERT INTO wishlist (user_id, book_id) VALUES (?, ?)', [userId, bookId], (error, result) => {
        if (error) {
          console.error('Error adding book to wishlist:', error);
          res.redirect('/books');
        } else {
          res.redirect('/bookshelf');
        }
      });
    } catch (error) {
      console.error('Error adding book to wishlist:', error);
      res.redirect('/books');
    }
  }
}

async function removeFromWishlist(req, res, userId) {
  const { bookId } = req.params;

  try {
    db.query('DELETE FROM wishlist WHERE user_id = ? AND book_id = ?', [userId, bookId], (error, result) => {
      if (error) {
        console.error('Error removing book from wishlist:', error);
        res.redirect('/bookshelf');
      } else {
        res.redirect('/bookshelf');
      }
    });
  } catch (error) {
    console.error('Error removing book from wishlist:', error);
    res.redirect('/bookshelf');
  }
}

function moveBook(req, res, userId, sourceTable, destinationTable) {
  const { bookId } = req.params;

  const removeQuery = `DELETE FROM ${sourceTable} WHERE user_id = ? AND book_id = ?`;
  const insertQuery = `INSERT INTO ${destinationTable} (user_id, book_id) VALUES (?, ?)`;


  db.query(removeQuery, [userId, bookId], (removeError) => {
    if (removeError) {
      console.error(`Error removing book from ${sourceTable}:`, removeError);
      return res.sendStatus(500);
    }

    db.query(insertQuery, [userId, bookId], (insertError) => {
      if (insertError) {
        console.error(`Error moving book to ${destinationTable}:`, insertError);
        return res.sendStatus(500);
      }
      res.redirect('/bookshelf');
    });
  });
}


async function getFavorites(req, res) {
  const userId = req.user.id;

  try {
    db.query('SELECT book_id FROM favorites WHERE user_id = ?', [userId], async (error, results) => {
      if (error) {
        console.error('Error retrieving favorites:', error);
        res.redirect('/bookshelf');
      } else {
        const bookIds = results.map((result) => result.book_id);
        const books = await fetchBooksByIds(bookIds);
        res.render('bookshelf', { books, listName: 'Favorites' });
      }
    });
  } catch (error) {
    console.error('Error retrieving favorites:', error);
    res.redirect('/bookshelf');
  }
}

async function getWishlist(req, res) {
  const userId = req.user.id;

  try {
    db.query('SELECT book_id FROM wishlist WHERE user_id = ?', [userId], async (error, results) => {
      if (error) {
        console.error('Error retrieving wishlist:', error);
        res.redirect('/bookshelf');
      } else {
        const bookIds = results.map((result) => result.book_id);
        const books = await fetchBooksByIds(bookIds);
        res.render('bookshelf', { books, listName: 'Wishlist' });
      }
    });
  } catch (error) {
    console.error('Error retrieving wishlist:', error);
    res.redirect('/bookshelf');
  }
}

async function getBookshelf(req, res) {
  const userId = req.user.id;

  try {
    const favoriteResults = await new Promise((resolve, reject) => {
      db.query('SELECT book_id FROM favorites WHERE user_id = ?', [userId], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    const favoriteBookIds = favoriteResults.map((result) => result.book_id);
    const favoriteBooks = await fetchBooksByIds(favoriteBookIds);

    const wishlistResults = await new Promise((resolve, reject) => {
      db.query('SELECT book_id FROM wishlist WHERE user_id = ?', [userId], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    const wishlistBookIds = wishlistResults.map((result) => result.book_id);
    const wishlistBooks = await fetchBooksByIds(wishlistBookIds);

    const readingResults = await new Promise((resolve, reject) => {
      db.query('SELECT book_id FROM reading WHERE user_id = ?', [userId], async (error, results) => {
        if (error) {
          reject(error);
        } else {
          const readingBookIds = results.map((result) => result.book_id);
          const readingBooks = await fetchBooksByIds(readingBookIds);

          const booksWithNotes = await Promise.all(
            readingBooks.map(async (book) => {
              const notes = await getBookNotes(userId, book.id);
              return { ...book, notes };
            })
          );

          resolve(booksWithNotes);
        }
      });
    });

    res.render('bookshelf', { favorites: favoriteBooks, wishlist: wishlistBooks, reading: readingResults });
  } catch (error) {
    console.error('Error retrieving bookshelf:', error);
    res.redirect('/bookshelf');
  }
}





async function fetchBookNotes(bookId, userId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT notes FROM reading_notes WHERE reading_id = ? AND user_id = ?', [bookId, userId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        const notes = results.map((result) => result.notes);
        resolve(notes);
      }
    });
  });
}



async function fetchBookNotes(bookId, userId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT notes FROM reading_notes WHERE reading_id = ? AND user_id = ?', [bookId, userId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        const notes = results.map((result) => result.notes);
        resolve(notes);
      }
    });
  });
}


async function fetchBooksByIds(bookIds) {
  const promises = bookIds.map((bookId) =>
    axios.get(`${API_BASE_URL}/volumes/${bookId}?key=${API_KEY}`)
  );

  const responses = await Promise.all(promises);

  const books = responses.map((response) => {
    const { id, volumeInfo } = response.data;
    const { title, authors, imageLinks } = volumeInfo;
    return {
      id,
      title,
      author: authors ? authors[0] : 'Unknown',
      thumbnail: imageLinks ? imageLinks.thumbnail : '',
    };
  });

  return books;
}


async function checkIfBookInWishlist(userId, bookId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM wishlist WHERE user_id = ? AND book_id = ?', [userId, bookId], (error, result) => {
      if (error) {
        console.error('Error checking if book is in wishlist:', error);
        reject(error);
      } else {
        resolve(result.length > 0);
      }
    });
  });
}

async function checkIfBookInFavorites(userId, bookId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM favorites WHERE user_id = ? AND book_id = ?', [userId, bookId], (error, result) => {
      if (error) {
        console.error('Error checking if book is in favorites:', error);
        reject(error);
      } else {
        resolve(result.length > 0);
      }
    });
  });
}

function addBookToReading(userId, bookId, callback) {
  const sql = 'INSERT INTO reading (user_id, book_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE book_id = ?';

  db.query(sql, [userId, bookId, bookId], (error, result) => {
    if (error) {
      callback(error);
    } else {
      callback(null, result);
    }
  });
}


function updateBookNotes(bookId, notes, userId) {


  return new Promise((resolve, reject) => {
    const getReadingIdQuery = 'SELECT id FROM reading WHERE user_id = ? AND book_id = ?';
    db.query(getReadingIdQuery, [userId, bookId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        if (results.length === 0) {
          reject(new Error('Reading not found'));
        } else {
          const readingId = results[0].id;
          const insertOrUpdateNotesQuery = 'INSERT INTO reading_notes (reading_id, notes) VALUES (?, ?) ON DUPLICATE KEY UPDATE notes = ?';
          db.query(insertOrUpdateNotesQuery, [readingId, notes, notes], (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        }
      }
    });
  });
}




async function removeFromReading(req, res, userId) {
  const { bookId } = req.params;

  try {
    db.query('DELETE FROM reading WHERE user_id = ? AND book_id = ?', [userId, bookId], (error, result) => {
      if (error) {
        console.error('Error removing book from reading:', error);
        res.redirect('/bookshelf');
      } else {
        res.redirect('/bookshelf');
      }
    });
  } catch (error) {
    console.error('Error removing book from reading:', error);
    res.redirect('/bookshelf');
  }
}

async function getBookNotes(userId, bookId) {
  return new Promise((resolve, reject) => {
    db.query('SELECT notes FROM reading_notes WHERE reading_id IN (SELECT id FROM reading WHERE user_id = ? AND book_id = ?)', [userId, bookId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        const notes = results.map((result) => result.notes);
        resolve(notes);
      }
    });
  });
}




module.exports = {
  searchBooks,
  addToFavorites,
  removeFromFavorites,
  addToWishlist,
  removeFromWishlist,
  moveBook,
  getFavorites,
  getWishlist,
  getBookshelf,
  addBookToReading,
  updateBookNotes,
  removeFromReading,
}