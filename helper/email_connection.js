var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'email.apbi@gmail.com',
    pass: '3M4Il_apB1'
  }
});

module.exports = transporter;

