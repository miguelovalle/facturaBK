var SignedXml = require('xml-crypto').SignedXml;
const fs = require('fs');
const { sobreParaFirma } = require('../soapFns/sobreParaFirma');
const { v4: uuidv4 } = require('uuid');

const firmarSobre = async (
  folderName,
  action,
  endPoint,
  testSetId,
  ambient
) => {
  const idForSignature = `SIG-${uuidv4()}`;
  try {
    const sobreAFirmar = sobreParaFirma(
      folderName,
      action,
      endPoint,
      testSetId,
      ambient
    );

    const keyPem = fs.readFileSync('./andes/private_key.pem', 'utf-8');

    const sig = new SignedXml({
      idAttribute: 'Id',
      inclusiveNamespacesPrefixList: ['wsa', 'soap', 'wcf'],
      idMode: 'wssecurity',
    });

    sig.privateKey = keyPem;
    sig.addReference({
      xpath:
        "//*[@*[local-name()='Id' and namespace-uri()='http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd']='id-7263790894BC9CCD41173783960969322']",
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: ['http://www.w3.org/2001/10/xml-exc-c14n#'],
      inclusiveNamespacesPrefixList: ['soap', 'wcf'],
    });
    //
    sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    sig.signatureAlgorithm =
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';

    const keyInfoContent = `
    <wsse:SecurityTokenReference wsu:Id="STR-7263790894BC9CCD41173783960969321">
    <wsse:Reference URI="#X509-7263790894BC9CCD41173783960969219" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
    </wsse:SecurityTokenReference>
  </ds:KeyInfo>
`;

    // Set the getKeyInfoContent method
    sig.getKeyInfoContent = () => keyInfoContent;

    // Agregar el atributo Id al elemento KeyInfo
    sig.keyInfoAttributes = {
      id: 'KI-7263790894BC9CCD41173783960969320',
    };

    sig.computeSignature(sobreAFirmar, {
      inclusiveNamespacesPrefixList: ['soap', 'wcf'],
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

    if (!response) {
      throw new Error(`HTTP Error: ${response.status}`);
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
