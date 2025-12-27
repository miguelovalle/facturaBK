const nodemailer = require('nodemailer');

async function sendMail(options) {
  try {
    const user = process.env.GMAIL_USER || 'edelmira.marinos@gmail.com';
    const pass = process.env.GMAIL_APP_PASSWORD || '';

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    const info = await transporter.sendMail(options);
    console.log('Correo enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar correo:', error.message);
    return null;
  }
}

module.exports = { sendMail };
