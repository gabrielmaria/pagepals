const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectToDatabase } = require('./db');

const app = express();

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.set('view engine', 'hbs');

connectToDatabase();

app.use(express.static("./public/"));
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

app.listen(5000, () => {
  console.log('Server started on Port 5000');
});
