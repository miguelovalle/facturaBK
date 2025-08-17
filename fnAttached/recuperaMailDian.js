const Imap = require('imap');
const MailParser = require('mailparser').MailParser;
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip'); // Para manejar archivos ZIP
const { Readable } = require('stream');

const recuperaMailDian = (cufeFraFirmada) => {
  // Configuración IMAP
  const imap = new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });

  const CUFE_A_BUSCAR = cufeFraFirmada;

  // accede a bandeja entrada
  function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
  }

  function extraerCUFEFromXML(xmlContent) {
    // Buscar CUFE en el XML
    const regex = /<cbc:UUID[^>]*schemeName="CUFE"[^>]*>([^<]+)<\/cbc:UUID>/i;
    const match = xmlContent.toString().match(regex);
    return match ? match[1] : null;
  }

  function procesarZipBuffer(zipBuffer, cufeBuscado) {
    try {
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      console.log('📄 Archivos en el ZIP:');
      let cufeEncontrado = null;
      let facturaXML = null;

      // Buscar el archivo XML con la factura
      for (const entry of zipEntries) {
        console.log(`  - ${entry.entryName}`);

        if (entry.entryName.endsWith('.xml') && !entry.isDirectory) {
          const content = zip.readFile(entry);
          const cufe = extraerCUFEFromXML(content);

          if (cufe) {
            console.log(`  🎯 CUFE encontrado en ${entry.entryName}: ${cufe}`);
            if (cufe === cufeBuscado) {
              cufeEncontrado = cufe;
              facturaXML = {
                nombre: entry.entryName,
                contenido: content,
              };
              break;
            }
          }
        }
      }

      return {
        cufeEncontrado,
        facturaXML,
      };
    } catch (error) {
      console.error('Error procesando ZIP:', error.message);
      return { cufeEncontrado: null, facturaXML: null };
    }
  }

  imap.once('ready', function () {
    openInbox(function (err, box) {
      if (err) throw err;

      // Buscar correos recientes de la DIAN
      const searchCriteria = [
        'FROM',
        'noreply@dian.gov.co',
        'SINCE',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        'SUBJECT',
        'validación de factura electrónica',
      ];

      const fetch = imap.seq.fetch('1:*', {
        bodies: '',
        struct: true,
      });

      fetch.on('message', function (msg, seqno) {
        const parser = new MailParser();

        msg.on('body', function (stream) {
          stream.on('data', function (chunk) {
            parser.write(chunk.toString('utf8'));
          });
        });

        parser.on('end', async function (mail) {
          console.log(`\n📧 Procesando correo #${seqno}: ${mail.subject}`);

          // Buscar adjuntos .zip
          if (mail.attachments && mail.attachments.length > 0) {
            for (const attachment of mail.attachments) {
              if (attachment.filename.endsWith('.zip')) {
                console.log(
                  `📦 Procesando archivo ZIP: ${attachment.filename}`
                );

                try {
                  // Convertir el buffer del adjunto a Buffer si es necesario
                  const zipBuffer = Buffer.isBuffer(attachment.content)
                    ? attachment.content
                    : Buffer.from(attachment.content);

                  // Procesar el ZIP buscando el CUFE
                  const resultado = procesarZipBuffer(zipBuffer, CUFE_A_BUSCAR);

                  if (
                    resultado.cufeEncontrado === CUFE_A_BUSCAR &&
                    resultado.facturaXML
                  ) {
                    console.log('✅ ¡Factura encontrada en el ZIP!');

                    // Crear directorio para guardar la factura
                    const carpetaFactura = `./facturas/${CUFE_A_BUSCAR}`;
                    if (!fs.existsSync(carpetaFactura)) {
                      fs.mkdirSync(carpetaFactura, { recursive: true });
                    }

                    // Guardar el XML de la factura
                    const xmlPath = path.join(
                      carpetaFactura,
                      resultado.facturaXML.nombre
                    );
                    fs.writeFileSync(xmlPath, resultado.facturaXML.contenido);
                    console.log(`💾 XML guardado: ${xmlPath}`);

                    // Guardar también el archivo ZIP original
                    const zipPath = path.join(
                      carpetaFactura,
                      attachment.filename
                    );
                    fs.writeFileSync(zipPath, zipBuffer);
                    console.log(`💾 ZIP original guardado: ${zipPath}`);

                    // Extraer todos los archivos del ZIP
                    const zip = new AdmZip(zipBuffer);
                    zip.extractAllTo(carpetaFactura, true);
                    console.log(
                      `📂 Todos los archivos extraídos a: ${carpetaFactura}`
                    );

                    imap.end(); // Terminar después de encontrar la factura
                    return;
                  }
                } catch (error) {
                  console.error(
                    `Error procesando ${attachment.filename}:`,
                    error.message
                  );
                }
              }
            }
          }
        });
      });

      fetch.once('error', function (err) {
        console.error('Error al obtener mensajes:', err);
      });

      fetch.once('end', function () {
        console.log('Finalizado el recorrido de mensajes');
        imap.end();
      });
    });
  });

  imap.once('error', function (err) {
    console.error('Error de conexión IMAP:', err);
  });

  imap.once('end', function () {
    console.log('Conexión cerrada');
  });

  imap.connect();
};

module.exports = recuperaMailDian;
