const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { DateTime } = require('luxon');
const { db } = require('../db');

exports.register = (req, res) => {
  const { username, email, password, passwordConfirm, country } = req.body;

  db.query('SELECT email, username FROM users WHERE email = ? OR username = ?', [email, username], async (error, results) => {
    if (error) {
      console.log(error);
    }
    if (results.length > 0) {
      const existingUserEmail = results.find(result => result.email === email);
      const existingUserUsername = results.find(result => result.username === username);

      if (existingUserEmail) {
        return res.render('register', { message: 'This email is already in use' });
      } else if (existingUserUsername) {
        return res.render('register', { message: 'This username already exists' });
      }
    } else if (password !== passwordConfirm) {
      return res.render('register', { message: 'Passwords do not match' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 8);
      db.query('INSERT INTO users SET ?', { username, email, password: hashedPassword, country }, (error, result) => {
        if (error) {
          console.log(error);
          return res.render('register', { message: 'Failed to register user' });
        }
        res.render('register', { message: 'User registered' });
      });
    } catch (error) {
      console.log(error);
    }
  });
};

exports.login = (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (error, results) => {
    if (error) {
      console.log(error);
    }

    if (results.length === 0) {
      return res.render('login', { message: 'Invalid username or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const expiresInDays = parseInt(process.env.JWT_EXPIRES_IN);
      const expiresInSec = expiresInDays * 24 * 60 * 60;
      const expirationTime = DateTime.local().plus({ seconds: expiresInSec });

      const token = jwt.sign({ id: user.id, username: username }, process.env.JWT_SECRET, {
        expiresIn: expiresInSec
      });

      const cookieOptions = {
        expires: expirationTime.toJSDate(),
        httpOnly: true
      };

      res.cookie('token', token, cookieOptions);
      res.redirect('/home');
    } else {
      res.render('login', { message: 'Invalid username or password' });
    }
  });
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

exports.getUsers = (req, res) => {
  const superuserId = 4;
  db.query('SELECT * FROM users WHERE id <> ?', [superuserId], (error, results) => {
    if (error) {
      console.log(error);
      return res.render('superuser', { users: [] });
    }
    res.render('superuser', { users: results });
  });
};

exports.addUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 8);
    db.query('INSERT INTO users SET ?', { username, email, password: hashedPassword }, (error, result) => {
      if (error) {
        console.log(error);
        return res.render('superuser', { message: 'Failed to add user' });
      }
      res.redirect('/superuser');
    });
  } catch (error) {
    console.log(error);
  }
};

exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (error, result) => {
    if (error) {
      console.log(error);
    }
    res.redirect('/superuser');
  });
};
