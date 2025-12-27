const { crearZIPadm } = require('../modulesBK/createXML');
const { firmarSobre, enviarSobre } = require('../soapFns/soapFirma');
const { withTimeout } = require('../helpers/utils');

const sendToDian = async (data, signed, nameXML, folderName, dianTimeoutMs) => {
  let zip64;
  try {
    zip64 = await crearZIPadm(signed, nameXML, folderName);
  } catch (error) {
    throw new Error(`Error al crear ZIP: ${error.message}`);
  }

  let sobreFirmado;
  try {
    sobreFirmado = await firmarSobre(
      folderName,
      data.soft.action,
      data.soft.endPoint,
      data.soft.testSetId,
      data.cufe.ambient,
      zip64
    );
  } catch (error) {
    throw new Error(`Error al firmar sobre SOAP: ${error.message}`);
  }

  try {
    const responseDian = await withTimeout(
      enviarSobre(data.soft.action, data.soft.endPoint, sobreFirmado),
      dianTimeoutMs,
      'DIAN no respondió'
    );

    return responseDian;

  } catch (error) {
    if (error.code === 'TIMEOUT') throw error;

    if (
      error.body &&
      typeof error.body === 'string' &&
      /<s?:Envelope[\s>]/i.test(error.body)
    ) {
      return error.body.replace(/`/g, '');
    }

    const err = new Error(`Error al enviar a DIAN: ${error.message}`);
    if (error.statusCode) err.statusCode = error.statusCode;
    if (error.body) err.body = error.body;
    throw err;
  }
};
module.exports = { sendToDian };
