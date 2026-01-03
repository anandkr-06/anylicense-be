const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: 'admin@anylicence.com.au',
    pass: 'u:|1>]U6Kr@',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.sendMail({
  from: '"Test" <admin@anylicence.com.au>',
  to: 'tech.anandkr@gmail.com',
  subject: 'SMTP Test',
  text: 'Hello from Hostinger SMTP',
}).then(console.log).catch(console.error);
