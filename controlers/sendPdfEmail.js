const { sendMail } = require('../fnAttached/sendMail');
const fs = require('fs').promises;
const path = require('path');

/**
 * Controlador para enviar correos electrónicos con archivos PDF adjuntos
 * @param {Object} req - Request object de Express
 * @param {Object} res - Response object de Express
 */
async function sendPdfEmail(req, res) {
    try {
        // Obtener la ruta del archivo PDF del body
        const { pdfFileName } = req.body;

        // Validar que se proporcionó el nombre del archivo
        if (!pdfFileName) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del archivo PDF es requerido',
            });
        }

        // Construir la ruta completa del archivo PDF
        const pdfPath = path.join(__dirname, '../pdfFiles', pdfFileName);

        // Verificar que el archivo existe
        try {
            await fs.access(pdfPath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: `El archivo ${pdfFileName} no existe en /pdfFiles`,
            });
        }

        // Leer el archivo PDF
        const pdfBuffer = await fs.readFile(pdfPath);

        // Configurar los parámetros del correo
        const mailOptions = {
            from: '"Marinos Bar Pescadero Restaurante" <femarinosbar@gmail.com>',
            to: 'cliente@ejemplo.com', // Puedes modificar esto según tus necesidades
            subject: 'Factura Electrónica - Marinos Bar Pescadero',
            html: createEmailBody(),
            attachments: [
                {
                    filename: pdfFileName,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        // Enviar el correo usando la función existente
        await sendMail(mailOptions);

        // Responder con éxito
        return res.status(200).json({
            success: true,
            message: 'Correo enviado exitosamente',
            emailSent: mailOptions.to,
            attachedFile: pdfFileName,
        });
    } catch (error) {
        console.error('Error al enviar correo con PDF:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al enviar el correo',
            error: error.message,
        });
    }
}

/**
 * Crea el cuerpo HTML del correo electrónico
 * @returns {string} HTML del correo
 */
function createEmailBody() {
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🐟 Marinos Bar Pescadero Restaurante</h1>
                <p>Factura Electrónica</p>
            </div>
            
            <div class="content">
                <h2>Estimado/a Cliente,</h2>
                
                <p>Esperamos que haya disfrutado de su experiencia en nuestro restaurante. Adjunto encontrará su factura electrónica correspondiente a su consumo del día ${currentDate}.</p>
                
                <div class="highlight">
                    <h3>📋 Detalles de la Factura:</h3>
                    <p><strong>Fecha de Emisión:</strong> ${currentDate}</p>
                </div>
                
                <p><strong>📎 Archivo Adjunto:</strong> Su factura electrónica se encuentra adjunta a este correo en formato PDF.</p>
                
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

module.exports = { sendPdfEmail };
