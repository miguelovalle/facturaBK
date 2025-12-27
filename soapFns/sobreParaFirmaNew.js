const { DateTime } = require('luxon');
const fs = require('fs');
const path = require('path');

function loadBinarySecurityToken() {
  const envContent = process.env.DIAN_CERT_BASE64;
  if (envContent && envContent.trim()) return envContent.trim();

  try {
    const p = path.resolve(process.cwd(), './andes/cert_base64.txt');
    const content = fs.readFileSync(p, 'utf8').trim();
    if (content) return content;
  } catch (_) {}

  try {
    const pemPath = path.resolve(process.cwd(), './andes/certificate.pem');
    const pem = fs.readFileSync(pemPath, 'utf8');
    const match = pem.match(
      /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/
    );
    if (match) return match[1].replace(/[\r\n\s]/g, '');
  } catch (_) {}

  throw new Error(
    'No se encontró certificado para BinarySecurityToken. Proporcione andes/cert_base64.txt o andes/certificate.pem o la variable DIAN_CERT_BASE64.'
  );
}

const sobreParaFirma = (
  nameFile,
  action,
  endPoint,
  testSetId,
  ambient,
  zip64
) => {
  const creatTime = DateTime.utc().toISO();

  const expiresTime = DateTime.utc().plus({ minutes: 1 }).toISO();

  const tokenBase64 = loadBinarySecurityToken();
  // const doc_base64 = fs.readFileSync('./xmlFiles/doc_base64.txt', {
  //   encoding: 'utf8',
  // });

  let sobre = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
  xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
      xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsu:Timestamp wsu:Id="TS-7263790894BC9CCD41173783960970524">
        <wsu:Created>${creatTime}</wsu:Created>
        <wsu:Expires>${expiresTime}</wsu:Expires>
      </wsu:Timestamp>
      <wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" wsu:Id="X509-7263790894BC9CCD41173783960969219">${loadBinarySecurityToken()}</wsse:BinarySecurityToken>
       </wsse:Security>
    <wsa:Action>http://wcf.dian.colombia/IWcfDianCustomerServices/${action}</wsa:Action>
    <wsa:To wsu:Id="id-7263790894BC9CCD41173783960969322"
      xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${endPoint}</wsa:To>
  </soap:Header>
  <soap:Body>
    <wcf:${action}>
      <!--Optional:-->
      <wcf:fileName>${nameFile}</wcf:fileName>
      <!--Optional:-->
      <wcf:contentFile>${zip64}</wcf:contentFile>
       <!--Optional:-->`;
  if (testSetId.length > 0) {
    sobre += `<wcf:testSetId>${testSetId}</wcf:testSetId>`;
  }

  sobre += `
  </wcf:${action}>
  </soap:Body>
</soap:Envelope>
`;
  //  fs.writeFileSync('./soapFns/sobrecopy.xml', sobre);
  return sobre;
};

module.exports = { sobreParaFirma };
