const fs = require('fs');
const path = require('path');

const inputFile = 'certificate.pfx';
const outputFile = 'cert_base64.txt';

try {
  // Leer el PFX en binario
  const pfxBuffer = fs.readFileSync(inputFile);

  // Convertir a Base64
  const base64String = pfxBuffer.toString('base64');

  // Guardar en archivo
  fs.writeFileSync(outputFile, base64String);

  console.log('Archivo Base64 generado con éxito:', outputFile);
} catch (err) {
  console.error('Error procesando el archivo:', err.message);
}
