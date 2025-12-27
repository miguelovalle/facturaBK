const { sendMail } = require('./sendMail');
const fs = require('fs').promises;
const path = require('path');

async function sendMailToClient(
  mailCliente,
  nameClient,
  signedAttached,
  nameAttached,
  CUFE,
  NoFra
) {
  try {
    // Validar datos requeridos
    if (!mailCliente) {
      throw new Error('Email del cliente es requerido');
    }

    // Crear el cuerpo del correo
    const emailBody = createEmailBody(
      nameClient || 'Estimado Cliente',
      NoFra,
      CUFE
    );

    // Configurar las opciones del correo
    const mailOptions = {
      from: '"Marinos Bar Pescadero Restaurante" <femarinosbar@gmail.com>',
      to: mailCliente,
      subject: `Factura Electrónica ${NoFra} - Marinos Bar Pescadero`,
      html: emailBody,
      attachments: [
        {
          filename: nameAttached,
          content: signedAttached,
          contentType: 'application/xml',
        },
      ],
    };

    // Enviar el correo
    await sendMail(mailOptions);
    console.log(`Correo enviado exitosamente a: ${mailCliente}`);
    return true;
  } catch (error) {
    console.error('Error al enviar correo al cliente:', error);
    throw error;
  }
}

function createEmailBody(clientName, NoFra, CUFE) {
  const currentDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura Electrónica</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
            .highlight { background-color: #e7f3ff; padding: 10px; border-left: 4px solid #2c5aa0; margin: 15px 0; }
            .button { display: inline-block; background-color: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🐟 Marinos Bar Pescadero Restaurante</h1>
                <p>Factura Electrónica</p>
            </div>
            
            <div class="content">
                <h2>Estimado/a ${clientName},</h2>
                
                <p>Esperamos que haya disfrutado de su experiencia en nuestro restaurante. Adjunto encontrará su factura electrónica correspondiente a su consumo del día ${currentDate}.</p>
                
                <div class="highlight">
                    <h3>📋 Detalles de la Factura:</h3>
                    <p><strong>Número de Factura:</strong> ${NoFra}</p>
                    <p><strong>CUFE:</strong> ${CUFE}</p>
                    <p><strong>Fecha de Emisión:</strong> ${currentDate}</p>
                </div>
                
                <p><strong>📎 Archivo Adjunto:</strong> Su factura electrónica se encuentra adjunta a este correo en formato XML, la cual tiene validez legal según la normativa colombiana de facturación electrónica.</p>
                
                <p>Si tiene alguna pregunta sobre su factura o necesita asistencia, no dude en contactarnos:</p>
                
                <ul>
                    <li>📞 Teléfono: 321-233-8970</li>
                    <li>📧 Email: femarinosbar@gmail.com</li>
                </ul>
                
                <p>¡Gracias por elegirnos y esperamos verle pronto!</p>
                
                <p>Atentamente,<br>
                <strong>Equipo Marinos Bar Pescadero Restaurante</strong></p>
            </div>
            
            <div class="footer">
                <p>Este es un correo automático, por favor no responda a esta dirección.</p>
                <p>Marinos Bar Pescadero Restaurante - Facturación Electrónica</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

module.exports = { sendMailToClient };
