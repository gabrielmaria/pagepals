const jwt = require('jsonwebtoken');

exports.redirectHome = (req, res, next) => {
    const token = req.cookies.token;

    if (token) {
        return res.redirect('/home');
    }
    next();
};

exports.requireAuth = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };

      const username = decoded.username;
      res.locals.username = username;

      next();
    } catch (error) {
      res.redirect('/login');
    }
  } else {
    res.redirect('/login');
  }
};

  


