const { response } = require('express');
const crypto = require('crypto');
const fs = require('fs');
const xml2js = require('xml2js');
const AdmZip = require('adm-zip');
const path = require('path');
const xpath = require('xpath');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const generarHashSHA384 = (data) => {
  const hash = crypto.createHash('sha384');
  hash.update(data, 'utf8');
  return hash.digest('hex');
};

const createfilename = (FechaFactura, Nit, consecEnvio, init) => {
  let digitYear, hexSConsecutivo;
  digitYear = FechaFactura.slice(2, 4);
  const nit10d = Nit.toString().padStart(10, 0);
  hexSConsecutivo = consecEnvio.toString(16).padStart(8, 0);
  const nameXML = init + nit10d + '000' + digitYear + hexSConsecutivo + '.xml';

  const folderName =
    'z' + nit10d + '000' + digitYear + hexSConsecutivo + '.zip';
  const Base64txt = 'z' + nit10d + '000' + digitYear + hexSConsecutivo + '.txt';
  return { nameXML, folderName, Base64txt };
};

const actualizaCUFE = async (softCode, CUFE, tyeDoc, ambient) => {
  console.log('cufe que llega a funcion que actualiza xml', CUFE);

  try {
    const tipo = tyeDoc;
    let xmlString = fs.readFileSync(
      './xmlFiles/DocumentParaFirma.xml',
      'utf-8'
    );
    // Quitar BOM y espacios iniciales
    xmlString = xmlString.replace(/^\uFEFF/, '').trimStart();

    // Agregar declaración XML si no existe
    if (!xmlString.startsWith('<?xml')) {
      xmlString =
        '<?xml version="1.0" encoding="UTF-8" standalone="no"? >\n' + xmlString;
    }

    // Parsear el XML
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');

    // Definir namespaces según el tipo de documento
    let namespaces;
    if (tipo === 'Invoice') {
      // Namespaces para facturas electrónicas (validados por DIAN)
      namespaces = {
        cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        sts: 'dian:gov:co:facturaelectronica:Structures-2-1',
        '': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', // Namespace por defecto
      };
    } else if (tipo === 'CreditNote' || tipo === 'DebitNote') {
      // Namespaces para notas de crédito y débito
      namespaces = {
        cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        sts: 'http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures',
        '':
          tipo === 'CreditNote'
            ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2'
            : 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2', // Namespace por defecto
      };
    } else {
      // Fallback a namespaces de factura por defecto
      namespaces = {
        cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        sts: 'dian:gov:co:facturaelectronica:Structures-2-1',
        '': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      };
    }

    // Crear función de selección con los namespaces
    const select = xpath.useNamespaces(namespaces);

    // Seleccionar y actualizar nodo para CUFE
    const UUIDNode = select('//cbc:UUID', doc, true);
    if (UUIDNode) {
      // Si el nodo tiene un nodo de texto, lo actualizamos
      if (UUIDNode.firstChild) {
        UUIDNode.firstChild.data = CUFE;
      } else {
        // Si no tiene nodo de texto, lo creamos
        const textNode = doc.createTextNode(CUFE);
        UUIDNode.appendChild(textNode);
      }
    } else {
      console.warn('No se encontró el nodo cbc:UUID en el documento XML');
    }

    // Seleccionar y actualizar nodo para SoftwareSecurityCode
    const securityCodeNode = select('//sts:SoftwareSecurityCode', doc, true);

    if (securityCodeNode) {
      // Eliminar todos los nodos hijos existentes
      while (securityCodeNode.firstChild) {
        securityCodeNode.removeChild(securityCodeNode.firstChild);
      }

      // Agregar el nuevo valor
      const textNode = doc.createTextNode(softCode);
      securityCodeNode.appendChild(textNode);
    } else {
      console.warn(
        'No se encontró el nodo SoftwareSecurityCode en el documento XML'
      );
    }

    // Seleccionar y actualizar nodo para QRCode
    const qrNode = select(`//sts:QRCode`, doc, true);

    if (qrNode) {
      // Limpiar el nodo existente
      while (qrNode.firstChild) {
        qrNode.removeChild(qrNode.firstChild);
      }
      let newQrValue;
      // Crear y agregar el nuevo contenido del QR
      if (ambient === '1') {
        newQrValue = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${CUFE}`;
      } else if (ambient === '2') {
        newQrValue = `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${CUFE}`;
      } else {
        console.warn('Ambiente no válido para generar QR');
        return null;
      }
      const qrTextNode = doc.createTextNode(newQrValue);
      qrNode.appendChild(qrTextNode);
    } else {
      console.warn('No se encontró el nodo QRCode en el documento XML');
    }

    // Serializar el XML
    const serializer = new XMLSerializer();
    let updatedXml = serializer.serializeToString(doc);

    // Asegurarse de que la declaración XML esté presente
    if (!updatedXml.startsWith('<?xml')) {
      updatedXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + updatedXml;
    }

    // Guardar el XML actualizado
    fs.writeFileSync('./xmlFiles/DocumentParaFirma.xml', updatedXml, 'utf-8');
    console.log('XML actualizado exitosamente');
    return updatedXml;
  } catch (error) {
    console.error('Error al actualizar el XML:', error);
    throw error; // Relanzar el error para manejarlo en el código que llama a esta función
  }
};

const crearZIPadm = async (signed, nameXML, folderName, opts = {}) => {
  if (!signed || !nameXML || !folderName) {
    throw new Error(
      'Parámetros obligatorios no pueden ser nulos o indefinidos'
    );
  }
  const zip = new AdmZip();
  zip.addFile(nameXML, signed);

  try {
    // Obtener el buffer del ZIP directamente sin escribir a disco
    const zipBuffer = zip.toBuffer();
    // Convertir el buffer a base64
    const contenidoBase64 = zipBuffer.toString('base64');

    // Escribir el contenido base64 al archivo
    const outBase64Path = opts.outBase64Path || './xmlFiles/doc_base64.txt';
    // Asegurar carpeta para doc_base64
    try {
      fs.mkdirSync(path.dirname(outBase64Path), { recursive: true });
    } catch (mkErr) {
      console.error('No se pudo crear el directorio para doc_base64:', mkErr);
    }
    await fs.promises.writeFile(outBase64Path, contenidoBase64);

    // Opcionalmente, también guardar el ZIP físico si es necesario
    const outZipDir = opts.outZipDir || './xmlFiles/zips';
    try {
      fs.mkdirSync(outZipDir, { recursive: true });
    } catch (mkErr) {
      console.error('No se pudo crear el directorio de salida ZIP:', mkErr);
    }
    const outputPath = path.join(outZipDir, folderName);
    await fs.promises.writeFile(outputPath, zipBuffer);

    // Devolver el contenido base64
    return contenidoBase64;
  } catch (err) {
    console.error('Error al procesar el archivo ZIP:', err);
    throw err;
  }
};

// Exportación de las funciones del módulo
module.exports = {
  generarHashSHA384,
  createfilename,
  actualizaCUFE,
  crearZIPadm,
};
