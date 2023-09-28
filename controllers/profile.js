const axios = require('axios');
const { db } = require('../db.js');

async function getUserProfile(req, res) {
  const userId = req.params.userId;

  try {
    const userQuery = 'SELECT * FROM users WHERE id = ?';
    const userParams = [userId];
    const [userProfile] = await executeQuery(userQuery, userParams);

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const bookshelfEntries = await getBookshelfEntries(userId);
    const bookIds = bookshelfEntries.map(entry => entry.book_id);

    const books = await Promise.all(bookIds.map(getBookDetailsFromAPI));

    res.render('user-profile', { userProfile, bookshelf: books });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.redirect('/');
  }
}

async function getProfile(req, res) {
  const userId = req.user.id;

  try {
    const query = 'SELECT * FROM users WHERE id = ?';
    const params = [userId];
    const [user] = await executeQuery(query, params);

    if (!user) {
      throw new Error('User not found');
    }

    const flagUrl = await fetchCountryFlag(user.country);

    res.render('profile', { user, flagUrl });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.render('profile', { error: 'Failed to fetch user profile' });
  }
}

async function updateProfile(req, res) {
  const userId = req.user.id;
  const { username } = req.body;

  try {
    const selectQuery = 'SELECT * FROM users WHERE id = ?';
    const selectParams = [userId];
    const [user] = await executeQuery(selectQuery, selectParams);

    if (!user) {
      throw new Error('User not found');
    }

    const query = 'UPDATE users SET username = ? WHERE id = ?';
    const params = [username, userId];

    await executeQuery(query, params);

    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.render('profile', { error: 'Failed to update profile' });
  }
}



async function updateProfilePicture(req, res) {
  const userId = req.user.id;

  if (!req.file) {
    return res.render('profile', { error: 'No file uploaded' });
  }

  const profilePicture = req.file.filename;

  try {
    const selectQuery = 'SELECT profile_picture FROM users WHERE id = ?';
    const selectParams = [userId];
    const [result] = await executeQuery(selectQuery, selectParams);
    const previousProfilePicture = result.profile_picture;

    if (previousProfilePicture) {
      // Delete previous profile picture
      fs.unlink(path.join(__dirname, `../public/uploads/${previousProfilePicture}`), (error) => {
        if (error) {
          console.log(error);
        }
      });
    }

    const updateQuery = 'UPDATE users SET profile_picture = ? WHERE id = ?';
    const updateParams = [profilePicture, userId];

    await executeQuery(updateQuery, updateParams);

    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.render('profile', { error: 'Failed to update profile picture' });
  }
}

async function executeQuery(query, params) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

async function fetchCountryFlag(country) {
  try {
    const response = await axios.get(`https://restcountries.com/v3.1/name/${country}`);
    const flagUrl = response.data[0].flags.svg;
    return flagUrl;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getUserProfile,
  updateProfilePicture,
};