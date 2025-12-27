var SignedXml = require('xml-crypto').SignedXml;
const fs = require('fs');
const { sobreParaFirma } = require('../soapFns/sobreParaFirma');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const firmarSobre = async (
  folderName,
  action,
  endPoint,
  testSetId,
  ambient,
  zip64
) => {
  const idForSignature = `SIG-${uuidv4()}`;
  try {
    const sobreAFirmar = sobreParaFirma(
      folderName,
      action,
      endPoint,
      testSetId,
      ambient,
      zip64
    );

    const keyPath = path.resolve(process.cwd(), './andes/private_key.pem');
    let keyPem;
    try {
      keyPem = fs.readFileSync(keyPath, 'utf-8');
    } catch (err) {
      throw new Error(`No se pudo leer la clave privada en ${keyPath}: ${err.message}`);
    }
    if (!keyPem || !keyPem.trim()) {
      throw new Error(`La clave privada está vacía en ${keyPath}. Extrae 'private_key.pem' desde el .p12/.pfx.`);
    }

    const sig = new SignedXml({
      idAttribute: 'Id',
      inclusiveNamespacesPrefixList: ['wsa', 'soap', 'wcf'],
      idMode: 'wssecurity',
    });

    // Soporte para clave con passphrase (si tu PEM está cifrado)
    const keyObject = process.env.ANDES_KEY_PASSPHRASE
      ? { key: keyPem, passphrase: process.env.ANDES_KEY_PASSPHRASE }
      : keyPem;

    sig.privateKey = keyObject;

    // Referencia a wsa:To (wsu:Id='id-...69322')
    sig.addReference({
      xpath:
        "//*[@*[local-name()='Id' and namespace-uri()='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd']='id-7263790894BC9CCD41173783960969322']",
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: ['http://www.w3.org/2001/10/xml-exc-c14n#'],
      inclusiveNamespacesPrefixList: ['soap', 'wcf', 'wsa'],
    });
    // Referencia al Timestamp (wsu:Id='TS-...70524')
    sig.addReference({
      xpath:
        "//*[@*[local-name()='Id' and namespace-uri()='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd']='TS-7263790894BC9CCD41173783960970524']",
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: ['http://www.w3.org/2001/10/xml-exc-c14n#'],
      inclusiveNamespacesPrefixList: ['soap', 'wcf', 'wsa'],
    });
    // Referencia al Body (wsu:Id='id-Body-...70525')
    sig.addReference({
      xpath:
        "//*[@*[local-name()='Id' and namespace-uri()='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd']='id-Body-7263790894BC9CCD41173783960970525']",
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: ['http://www.w3.org/2001/10/xml-exc-c14n#'],
      inclusiveNamespacesPrefixList: ['soap', 'wcf', 'wsa'],
    });
    //
    sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    sig.signatureAlgorithm =
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';

    const keyInfoContent = `
    <wsse:SecurityTokenReference wsu:Id="STR-7263790894BC9CCD41173783960969321" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:Reference URI="#X509-7263790894BC9CCD41173783960969219" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
    </wsse:SecurityTokenReference>`;

    // Set the getKeyInfoContent method
    sig.getKeyInfoContent = () => keyInfoContent;

    // Agregar el atributo Id al elemento KeyInfo
    sig.keyInfoAttributes = {
      id: 'KI-7263790894BC9CCD41173783960969320',
    };

    sig.computeSignature(sobreAFirmar, {
      inclusiveNamespacesPrefixList: ['soap', 'wcf', 'wsa'],
      attrs: { Id: idForSignature },
      prefix: 'ds',
      location: {
        reference: "//*[local-name(.)='BinarySecurityToken']",
        action: 'after',
      },
    });

    // Obtén el XML firmado
    const sobreFirmado = sig.getSignedXml();

    // Guarda o utiliza el XML firmado según sea necesario
    fs.writeFileSync('./xmlFiles/sobreFirmado.xml', sobreFirmado);

    return sobreFirmado;
  } catch (error) {
    console.error('Error al firmar sobre:', error);
  }
};

const enviarSobre = async (action, endPoint, sobreFirmado) => {
  const actionUrl = `http://wcf.dian.colombia/IWcfDianCustomerServices/${action}`;

  // Configura los encabezados HTTP
  const headers = {
    'Accept-Encoding': 'gzip,deflate',
    'Content-Type': `application/soap+xml;charset=UTF-8;action="${actionUrl}"`,
  };

  try {
    // Enviar la solicitud POST
    const response = await fetch(endPoint, {
      method: 'POST',
      headers: headers,
      body: sobreFirmado,
    });
    // Detectar errores HTTP (e.g., 500) y capturar el cuerpo (HTML)
    if (!response.ok) {
      const errorBody = await response.text();
      const err = new Error(`HTTP Error ${response.status}`);
      err.statusCode = response.status;
      err.body = errorBody;
      throw err;
    }

    const responseXml = await response.text();

    console.log('SOAP Response:', responseXml);

    return responseXml; // Retornamos el XML para su posterior procesamiento
  } catch (error) {
    console.error('Error al enviar el sobre SOAP:', error);
    throw error; // Relanzamos el error para que pueda ser manejado por el llamador
  }
};

module.exports = { firmarSobre, enviarSobre };
