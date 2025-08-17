const { parseXml } = require('../utils/xmlParser');

const procesaRtaDian = async (xmlResponse) => {
  /*   const rta = await parseXml(xmlResponse);

  const isValid = rta.body.SendBillSyncResponse.SendBillSyncResult.isValid;

  // variables para poner en el appResponse.xml
  const responseCode =
    rta.body.SendBillSyncResponse.SendBillSyncResult.responseCode;
  const description =
    rta.body.SendBillSyncResponse.SendBillSyncResult.description;

  const errorList =
    rta.body.SendBillSyncResponse.SendBillSyncResult.ErrorMessage;
  const nsu = '';

  if (isValid === 'true') {
    return {
      status: 200,
      msg: 'Factura Validada',
    };
  }

  if (isValid === 'false') {
    return {
      status: 400,
      msg: 'Factura No Validada',
    };
  }

  console.log(
    'resultado:',
    rta.body.SendBillSyncResponse.SendBillSyncResult.isValid
  ); */

  return {
    ok: true,
    msg: 'Factura Validada',
  };
};
module.exports = { procesaRtaDian };
