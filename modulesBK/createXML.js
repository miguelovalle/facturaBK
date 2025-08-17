const { response } = require('express');
const crypto = require('crypto');
const fs = require('fs');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');

const generarHashSHA384 = (data) => {
  const hash = crypto.createHash('sha384'); // Especificamos SHA-384
  hash.update(data, 'utf8'); // Actualizamos con los datos que queremos hashear
  return hash.digest('hex');
};

const createfilename = (FechaFactura, Nit, consecEnvio, init) => {
  let digitYear, hexSConsecutivo;
  digitYear = FechaFactura.slice(2, 4);
  const nit10d = Nit.toString().padStart(10, 0);
  hexSConsecutivo = consecEnvio.toString(16).padStart(8, 0);
  const nameXML = init + nit10d + '000' + digitYear + hexSConsecutivo + '.xml';
  const folderName =
    'Z' + nit10d + '000' + digitYear + hexSConsecutivo + '.zip';
  return { nameXML, folderName };
};

const actualizaCUFE = async (softCode, CUFE, typeDoc) => {
  const actualizar = async (softCode, CUFE, typeDoc) => {
    return new Promise((resolve, reject) => {
      fs.readFile(
        './xmlFiles/DocumentParaFirma.xml',
        'utf-8',
        (err, paraActualizar) => {
          if (err) {
            console.error('Error al leer el archivo:', err);
            reject(err);
          } else {
            const parser = new xml2js.Parser();
            parser.parseString(paraActualizar, (err, result) => {
              if (err) {
                console.error('Error al parsear el XML:', err);
                reject(err);
              } else {
               // console.log('typeDoc', typeDoc);
                // Actualizar el valor de los nodos
                result[typeDoc]['cbc:UUID'][0]._ = CUFE;

                result[typeDoc]['ext:UBLExtensions'][0]['ext:UBLExtension'][0][
                  'ext:ExtensionContent'
                ][0]['sts:DianExtensions'][0]['sts:SoftwareSecurityCode'][0]._ =
                  softCode;

                const vrActual =
                  result[typeDoc]['ext:UBLExtensions'][0][
                    'ext:UBLExtension'
                  ][0]['ext:ExtensionContent'][0]['sts:DianExtensions'][0][
                    'sts:QRCode'
                  ][0];

                const nvoValor = vrActual + CUFE;

                result[typeDoc]['ext:UBLExtensions'][0]['ext:UBLExtension'][0][
                  'ext:ExtensionContent'
                ][0]['sts:DianExtensions'][0]['sts:QRCode'][0] = nvoValor;

                resolve(result);
              }
            });
          }
        }
      );
    });
  };

  /**
   * Reconstruye el XML a partir del objeto actualizado
   * @private
   * @param {Object} result - Objeto con la estructura del XML
   * @returns {Promise<string>} XML formateado
   */
  function reconvertirXML(result) {
    return new Promise((resolve, reject) => {
      const xmlBuilder = new xml2js.Builder();
      let xmlActualizado = xmlBuilder.buildObject(result);
      if (xmlActualizado.includes('<?xml')) {
        // Reemplazar standalone='yes' por standalone='no'
        xmlActualizado = xmlActualizado.replace(
          /standalone=["']yes['"]/,
          'standalone="no"'
        );
        fs.writeFileSync('./xmlFiles/DocumentParaFirma.xml', xmlActualizado);
      }
      resolve(xmlActualizado);
    });
  }
  const objActualizado = await actualizar(softCode, CUFE, typeDoc);
  const xmlActualizado = await reconvertirXML(objActualizado);
  return xmlActualizado;
};

const crearZIPadm = async (signed, nameXML, folderName) => {
  const outputPath = './zips/' + folderName;

  const zip = new AdmZip();
  zip.addFile(nameXML, signed);
  await zip.writeZip(outputPath);

  fs.readFile(outputPath, (err, data) => {
    if (err) {
      console.error('Error al leer el archivo:', err);
      return;
    }
    // Convertir el contenido del archivo a Base64
    const contenidoBase64 = data.toString('base64');
    // Guardar el contenido Base64 en un nuevo archivo
    const rutaSalida = './xmlFiles/doc_base64.txt';
    fs.writeFile(rutaSalida, contenidoBase64, (err) => {
      if (err) {
        console.error('Error al guardar el archivo Base64:', err);
        return;
      }
    });
  });
};

// Exportación de las funciones del módulo
module.exports = {
  generarHashSHA384,
  createfilename,
  actualizaCUFE,
  crearZIPadm,
};
