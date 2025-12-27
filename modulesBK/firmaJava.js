const axios = require('axios');
const { xml } = require('body-parser');
const fs = require('fs');

const firmaJava = async (nameXML, xmlUpdated) => {
  if (!xmlUpdated || xmlUpdated.trim() === '') {
    throw new Error('XML vacío o no proporcionado');
  }

  try {
    const xmlBase64 = Buffer.from(xmlUpdated).toString('base64');

    const response = await axios.post(
      'http://localhost:8080/api/signature/sign',
      {
        xmlContent: xmlBase64,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // Accept: 'application/json',
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`Error al firmar: ${response.statusText}`);
    }
    const exito = response.data.success;
    const factura = response.data.signedXmlContent;

    if (!exito || !factura) {
      console.error(
        'Claves disponibles en response.data:',
        Object.keys(response.data)
      );
      throw new Error(
        'La respuesta del servicio de firma no contiene signedXmlContent. Estructura recibida: ' +
          JSON.stringify(Object.keys(response.data))
      );
    }

    const decodedFactura = Buffer.from(factura, 'base64').toString('utf-8');
    //console.log("factura firmada decodificada", decodedFactura)
    // Asegurar directorio de salida

    const outPath = `./xmlFiles/${nameXML}`;
    await fs.writeFileSync(outPath, decodedFactura, 'utf-8');
    console.log('documento guardado ' + outPath);
    return decodedFactura;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { firmaJava };
