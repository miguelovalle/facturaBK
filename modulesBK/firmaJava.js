const axios = require('axios');
const fs = require('fs');

const firmaJava = async (nameXML, xmlUpdated) => {
  try {
    const response = await axios.post(
      'http://localhost:8080/api/sign/xades-epes',
      { xmlContent: xmlUpdated, certificatePassword: '9Ep3KxPRph' },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (response.status !== 200) {
      throw new Error(`Error al firmar: ${response.statusText}`);
    }
    // console.log('respuesta', response.data.signedXml);
    const factura = response.data.signedXml; // Procesa el stream como texto
    //console.log(factura);
    await fs.writeFileSync(`./xmlFiles/facturas/${nameXML}`, factura, 'utf-8');
    console.log('documento guardado' + `./xmlFiles/facturas/${nameXML}`);
    return factura;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { firmaJava };
