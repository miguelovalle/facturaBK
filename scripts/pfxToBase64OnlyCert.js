const fs = require('fs');
const forge = require('node-forge');

const pfxPath = 'Certificado.pfx'; // tu archivo
const outputBase64 = 'cert_base64.txt'; // archivo de salida
const pfxPassword = 'PWDZs45Zku'; // contraseña del PFX

try {
  // Leer el archivo PFX en binario
  const pfxBuffer = fs.readFileSync(pfxPath);

  // Convertir a ASN.1
  const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));

  // Cargar PKCS#12 utilizando la contraseña
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, pfxPassword);

  // Buscar el certificado X.509 (NO la llave privada)
  let certificate = null;

  pfx.safeContents.forEach((safeContent) => {
    safeContent.safeBags.forEach((safeBag) => {
      if (safeBag.cert) {
        certificate = safeBag.cert;
      }
    });
  });

  if (!certificate) {
    throw new Error('No se encontró ningún certificado dentro del PFX.');
  }

  // Convertir el certificado a DER
  const certAsn1 = forge.pki.certificateToAsn1(certificate);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();

  // Convertir a Base64
  const base64Cert = Buffer.from(certDer, 'binary').toString('base64');

  // Guardar el resultado
  fs.writeFileSync(outputBase64, base64Cert);

  console.log('Certificado X.509 exportado correctamente → cert_base64.txt');
} catch (error) {
  console.error('ERROR:', error.message);
}
