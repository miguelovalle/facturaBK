const { parseString } = require('xml2js');

/**
 * Convierte un string XML a un objeto JavaScript
 * @param {string} xmlString - String XML a convertir
 * @returns {Promise<Object>} Objeto JavaScript con los datos del XML
 */
const parseXml = (xmlString) => {
  return new Promise((resolve, reject) => {
    parseString(xmlString, { explicitArray: false, trim: true }, (err, result) => {
      if (err) {
        console.error('Error al parsear XML:', err);
        return reject(new Error('Error al procesar el XML'));
      }
      resolve(result);
    });
  });
};

module.exports = { parseXml };