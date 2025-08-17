
const sendmail= (email) =>{
 const nodemailer = require('nodemailer');
const path = require('path');

async function enviarFactura() {
    // Configuración de transporte SMTP con Gmail
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'tucorreo@gmail.com',
            pass: 'TU_CONTRASEÑA_DE_APLICACION'
        }
    });

    // Configuración del correo
    let info = await transporter.sendMail({
        from: '"Marinos Bar Pescadero Restaurante" <tucorreo@gmail.com>', // Remitente
        to: email, // Destinatario
        subject: 'Factura electrónica',
        text: 'Adjunto encontrarás tu factura electrónica.',
        html: '<p>Adjunto encontrarás tu <b>factura electrónica</b>.</p>',
        attachments: [
            {
                filename: 'factura.xml',
                path: path.join(__dirname, 'factura.xml'), // Ruta del archivo XML
                contentType: 'text/xml'
            },
            {
                filename: 'factura.pdf',
                path: path.join(__dirname, 'factura.pdf'), // Ruta del PDF si tienes uno
                contentType: 'application/pdf'
            }
        ]
    });

    console.log('Correo enviado:', info.messageId);
}
 
}
module.exports = { sendmail };
