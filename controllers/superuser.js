const { db } = require('../db');

exports.superuser = (req, res) => {
    const userId = req.user.id;
    console.log(userId);
    if (userId === 4) {
      db.query('SELECT * FROM users', (error, results) => {
        if (error) {
          console.log(error);
        }
  
        const users = results;
        res.render('superuser', { users });
      });
    } else {
      res.redirect('/home');
    }
  };
  

exports.editUser = (req, res) => {
  const userId = req.params.userId;

  db.query('SELECT * FROM users WHERE id = ?', [userId], (error, results) => {
    if (error) {
      console.log(error);
    }

    const user = results[0];
    res.render('edit-user', { user });
  });
};

exports.updateUser = (req, res) => {
  const userId = req.params.userId;
  const { username, email } = req.body;

  db.query('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, userId], (error, results) => {
    if (error) {
      console.log(error);
    }

    res.redirect('/superuser');
  });
};

exports.deleteUser = (req, res) => {
  const userId = req.params.userId;

  db.query('DELETE FROM users WHERE id = ?', [userId], (error, results) => {
    if (error) {
      console.log(error);
    }

    res.redirect('/superuser');
  });
};
