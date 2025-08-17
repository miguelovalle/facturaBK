const crypto = require('crypto');
const fs = require('fs');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');

const generarHashSHA384 = (data) => {
  const hash = crypto.createHash('sha384'); 
  hash.update(data, 'utf8'); 
  return hash.digest('hex');
};

const createfilename = (FechaFactura, Nit, consecEnvio, init) => {
  const digitYear = FechaFactura.slice(2, 4);
  const nit10d = Nit.toString().padStart(10, '0');
  const hexSConsecutivo = consecEnvio.toString(16).padStart(8, '0');
  const nameXML = `${init}${nit10d}000${digitYear}${hexSConsecutivo}.xml`;
  const folderName = `Z${nit10d}000${digitYear}${hexSConsecutivo}.zip`;
  return { nameXML, folderName };
};

const actualizaCUFE = (softCode, CUFE, typeDoc) => {
  return new Promise((resolve, reject) => {
    fs.readFile(
      './xmlFiles/DocumentParaFirma.xml',
      'utf-8',
      (err, paraActualizar) => {
        if (err) {
          console.error('Error al leer el archivo:', err);
          reject(err);
          return;
        }

        const parser = new xml2js.Parser();
        parser.parseString(paraActualizar, (err, result) => {
          if (err) {
            console.error('Error al parsear el XML:', err);
            reject(err);
            return;
          }

          // Actualizar el CUFE en el XML
          if (result[typeDoc]?.['cbc:UUID']?.[0]) {
            result[typeDoc]['cbc:UUID'][0]['_'] = CUFE;
          }

          // Actualizar el código de seguridad del software si existe
          const extensions = result[typeDoc]?.['ext:UBLExtensions']?.[0]?.['ext:UBLExtension'];
          
          if (extensions) {
            for (const ext of extensions) {
              const dianExt = ext?.['ext:ExtensionContent']?.[0]?.['sts:DianExtensions']?.[0];
              if (dianExt) {
                // Actualizar código de seguridad
                if (dianExt['sts:SoftwareSecurityCode']?.[0]) {
                  dianExt['sts:SoftwareSecurityCode'][0]['_'] = softCode;
                }
                
                // Actualizar el QRCode si existe
                if (dianExt['sts:QRCode']?.[0]) {
                  dianExt['sts:QRCode'][0] = `https://catalogo-vpfe.dian.gov.co/Document/ShowDocument?documentKey=${CUFE}`;
                }
              }
            }
          }

          const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            renderOpts: { pretty: true, indent: '  ', newline: '\n' },
            headless: true
          });

          try {
            const xmlActualizado = builder.buildObject(result);
            fs.writeFileSync('./xmlFiles/DocumentParaFirma.xml', xmlActualizado, 'utf8');
            resolve(xmlActualizado);
          } catch (error) {
            console.error('Error al guardar el archivo:', error);
            reject(error);
          }
        });
      }
    );
  });
};

const crearZIPadm = async (signed, nameXML, folderName) => {
  const outputPath = `./zips/${folderName}`;
  const zip = new AdmZip();
  
  return new Promise((resolve, reject) => {
    try {
      // Asegurarse de que el directorio de salida existe
      if (!fs.existsSync('./zips')) {
        fs.mkdirSync('./zips', { recursive: true });
      }
      
      // Agregar archivo al ZIP
      zip.addFile(nameXML, Buffer.from(signed));
      
      // Escribir el archivo ZIP
      zip.writeZip(outputPath, (err) => {
        if (err) {
          console.error('Error al crear el archivo ZIP:', err);
          reject(err);
          return;
        }
        
        // Leer el archivo ZIP y convertirlo a base64
        fs.readFile(outputPath, (err, data) => {
          if (err) {
            console.error('Error al leer el archivo ZIP:', err);
            reject(err);
            return;
          }
          
          const contenidoBase64 = data.toString('base64');
          const rutaSalida = 'doc_base64.txt';
          
          fs.writeFile(rutaSalida, contenidoBase64, (err) => {
            if (err) {
              console.error('Error al guardar el archivo base64:', err);
              reject(err);
              return;
            }
            
            resolve({ 
              outputPath, 
              base64Path: rutaSalida,
              message: 'Archivo procesado exitosamente'
            });
          });
        });
      });
    } catch (error) {
      console.error('Error en crearZIPadm:', error);
      reject(error);
    }
  });
};

// Exportación de las funciones del módulo
module.exports = {
  generarHashSHA384,
  createfilename,
  actualizaCUFE,
  crearZIPadm
};
