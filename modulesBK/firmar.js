const fs = require('fs');
const { Crypto } = require('@peculiar/webcrypto');
const xadesjs = require('xadesjs');
const { XMLSerializer } = require('@xmldom/xmldom');
const { v4: uuidv4 } = require('uuid');
const {
  generarSigningCertificates,
  preparePem,
  pem2der,
  addSigningCert,
} = require('./signFn');

const crypto = new Crypto();

xadesjs.Application.setEngine('NodeJS', new Crypto());

const signFile = async (nameXML, xmlUpdated) => {
  const idForKeyInfo = `xmldsig-${uuidv4()}-keyinfo`;

  try {
    const alg = {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'sha-384',
    };

    const certPem = fs
      .readFileSync('./andes/certificate.pem', {
        encoding: 'utf8',
      })
      .trim();

    const x509 = preparePem(certPem);

    // Read private key
    const keyPem = fs.readFileSync('./andes/private_key.pem', {
      encoding: 'utf8',
    });

    const keyDer = pem2der(keyPem);

    const key = await crypto.subtle.importKey('pkcs8', keyDer, alg, true, [
      'sign',
    ]);

    // read public key
    const publicPem = fs.readFileSync('./andes/public_key.pem', {
      encoding: 'utf8',
    });
    const publicDer = pem2der(publicPem);
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicDer,
      alg,
      true,
      ['verify']
    );
    signedXml.XmlSignature.KeyInfo.Id;
    // Parse document
    var xml = xadesjs.Parse(xmlUpdated);

    const certs = generarSigningCertificates();

    var signedXml = new xadesjs.SignedXml();

    signedXml.XmlSignature.KeyInfo.Id = idForKeyInfo;
    // signedXml.XmlSignature.Id = `xmldsig-${uuidv4()}`;
    const idForSignature = signedXml.XmlSignature.Id;

    signedXml.SignedProperties.Id = `${idForSignature}-signedprops`;

    certs.slice(0).forEach((cert) => {
      addSigningCert(signedXml, cert, 'SHA-384');
    });

    //Firma el xml
    const signature = await signedXml.Sign(
      alg, // algorithm
      key, // key
      xml, // document
      {
        // options
        id: idForSignature,

        keyvalue: publicKey,

        x509: [x509],
        references: [
          {
            id: `${idForSignature}-ref0`,
            uri: '',
            hash: 'sha-384',
            transforms: ['enveloped'],
          },
          {
            hash: 'sha-384',
            uri: `#${idForKeyInfo}`,
          },
        ],
        signingTime: {
          format: 'isoDateTime',
        },
        policy: {
          hash: 'sha-256',
          identifier: {
            value:
              'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf',
            description:
              'Política de firma para facturas electrónicas de la República de Colombia',
          },
        },
        signerRole: { claimed: ['supplier'] },
      }
    );

    const nodeSign = signature.GetXml();

    const signatureValueNode =
      nodeSign.getElementsByTagName('ds:SignatureValue')[0];
    if (signatureValueNode) {
      signatureValueNode.setAttribute('Id', `${idForSignature}-sigvalue`);
    }

    // Obtener el segundo nodo /ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent
    const extensionContent = xml.getElementsByTagName(
      'ext:ExtensionContent'
    )[1];

    extensionContent.appendChild(nodeSign);

    // serialize XML
    const oSerializer = new XMLSerializer();
    const sXML = await oSerializer.serializeToString(xml);
    await fs.writeFileSync(`./xmlFiles/facturas/${nameXML}`, sXML, 'utf-8');

    console.log('documento guardado' + `./xmlFiles/facturas/${nameXML}`);

    // Validar la firma
    const isValid = await signedXml.Verify();
    isValid
      ? console.log('✅ La firma es válida.')
      : console.log('❌ La firma no es válida.');
    return sXML;
  } catch (error) {
    console.error('Error al firmar el archivo:', error);
  }
};
module.exports = { signFile };
