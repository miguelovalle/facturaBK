const { DateTime } = require('luxon');
const fs = require('fs');

const sobreParaFirma = (nameFile, action, endPoint, testSetId, ambient) => {
  const creatTime = DateTime.utc().toISO();

  const expiresTime = DateTime.utc().plus({ minutes: 1 }).toISO();

  const doc_base64 = fs.readFileSync('./xmlFiles/doc_base64.txt', {
    encoding: 'utf8',
  });

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
      <wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" wsu:Id="X509-7263790894BC9CCD41173783960969219">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</wsse:BinarySecurityToken>
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
      <wcf:contentFile>${doc_base64}</wcf:contentFile>
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
