const { DateTime } = require('luxon');
const fs = require('fs');

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
