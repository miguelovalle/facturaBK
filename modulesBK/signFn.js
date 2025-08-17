const fs = require('fs');
const forge = require('node-forge');
const { create } = require('xmlbuilder');
const crypto = require('crypto');
const { Buffer } = require('buffer');
var xmldsigjs = require('xmldsigjs');
const xadesjs = require('xadesjs');

async function addSigningCert(signedXml, cert, hash) {
  const signedProperties = signedXml.SignedProperties;

  const xmlCert = new xadesjs.xml.Cert();

  xmlCert.IssuerSerial.X509IssuerName = cert.issuerName;

  xmlCert.IssuerSerial.X509SerialNumber = cert.serialNumber;

  const alg = xmldsigjs.CryptoConfig.GetHashAlgorithm(hash);

  xmlCert.CertDigest.DigestMethod.Algorithm = alg.namespaceURI;

  xmlCert.CertDigest.DigestValue = cert.thumb8Array;

  signedProperties.SignedSignatureProperties.SigningCertificate.Add(xmlCert);
}
function preparePem(pem) {
  return (
    pem
      // remove BEGIN/END
      .replace(/-----(BEGIN|END)[\w\d\s]+-----/g, '')
      // remove \r, \n
      .replace(/[\r\n]/g, '')
  );
}

function pem2der(pem) {
  pem = preparePem(pem);
  // convert base64 to ArrayBuffer
  const binBuffer = new Uint8Array(Buffer.from(pem, 'base64')).buffer;
  return binBuffer;
}

const obtenerCadenaCerts = () => {
  function normalizeCertificate(certPem) {
    if (!certPem || typeof certPem !== 'string') {
      throw new Error('El certificado no es válido o está vacío.');
    }

    // Normalizar eliminando encabezados y pies
    const certBase64 = certPem
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\r?\n|\r/g, ''); // Eliminar saltos de línea

    return certBase64;
  }

  try {
    // Leer el archivo PFX
    const pfxBuffer = fs.readFileSync('./andes/certificado.pfx');
    const password = '9Ep3KxPRph';

    // Cargar el archivo PFX
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extraer los certificados del PFX
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    if (
      !certBags[forge.pki.oids.certBag] ||
      certBags[forge.pki.oids.certBag].length === 0
    ) {
      throw new Error('No se encontraron certificados en el archivo PFX.');
    }

    // Iterar sobre los certificados y normalizarlos
    const x509Certificates = certBags[forge.pki.oids.certBag].map(
      (bag, index) => {
        if (bag.cert) {
          const certPem = forge.pki.certificateToPem(bag.cert); // Convertir a PEM
          const normalizedCert = normalizeCertificate(certPem); // Normalizar el formato
          fs.writeFileSync(`./andes/cert-${index}.pem`, certPem);
          fs.writeFileSync(`./andes/certB64-${index}.pem`, normalizedCert);
          return normalizedCert; // Agregar a la lista de certificados
        } else {
          return console.warn(
            'Certificado vacío encontrado en el archivo PFX.'
          );
        }
      }
    );

    if (x509Certificates.length === 0) {
      throw new Error(
        'No se pudieron extraer certificados válidos del archivo PFX.'
      );
    }

    // console.log('Certificados Normalizados:', x509Certificates);
  } catch (error) {
    console.error('Ocurrió un error:', error.message);
  }
};

const generarSigningCertificates = () => {
  // generar los 3 certificados: firmante, certificadora intermedia, certificadora raiz

  function prepareCert(certPem) {
    const certDer = crypto
      .createPublicKey(certPem)
      .export({ type: 'spki', format: 'der' });

    const thumbprint = crypto
      .createHash('sha384')
      .update(certDer)
      .digest('hex');

    //obtiene la huella del certificado
    const thumb8Array = new Uint8Array(Buffer.from(thumbprint, 'hex'));

    // obtiene el nombre del certificado
    const cert = forge.pki.certificateFromPem(certPem);
    const issuerName = cert.issuer.attributes
      .map((attr) => `${attr.shortName}=${attr.value}`)
      .join(', ');

    const serialNumber = new forge.jsbn.BigInteger(
      cert.serialNumber,
      16
    ).toString();

    return {
      thumb8Array,
      issuerName,
      serialNumber,
    };
  }

  // Certificados en formato PEM (firmante, intermedia, raíz)

  const signerCertPem = fs.readFileSync('./andes/cert-0.pem', {
    encoding: 'utf8',
  })

  const intermediateCertPem = fs.readFileSync('./andesNew/ClaseIIv3_1_.crt', {
    encoding: 'utf8',
  });

  const rootCertPem = fs.readFileSync('./andesNew/Raiz_3_.crt', {
    encoding: 'utf8',
  });

  // Generar los elementos <Cert> para los 3 certificados
  const certs = [
    prepareCert(signerCertPem),
    prepareCert(intermediateCertPem),
    prepareCert(rootCertPem),
  ];
  return certs;
};

module.exports = {
  obtenerCadenaCerts,
  generarSigningCertificates,
  preparePem,
  pem2der,
  addSigningCert,
};
