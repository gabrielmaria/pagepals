const PDFDocument = require('pdfkit');
const { db } = require('../db');

const generatePDF = (req, res) => {
  const doc = new PDFDocument();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="users.pdf"');

  doc.pipe(res);

  db.query('SELECT * FROM users', (error, results) => {
    if (error) {
      console.log(error);
      return res.status(500).send('An error occurred while fetching users data.');
    }

    generatePDFContent(doc, results);

    doc.end();
  });
};

function generatePDFContent(doc, users) {
  doc.fontSize(16).text('Users', { align: 'center' }).moveDown(0.5);
  
  users.forEach((user) => {
    doc.fontSize(12).text(`Username: ${user.username}`);
    doc.fontSize(12).text(`Email: ${user.email}`).moveDown(0.5);
    doc.fontSize(12).text(`Country: ${user.country}`);
  });
}

module.exports = { generatePDF };
