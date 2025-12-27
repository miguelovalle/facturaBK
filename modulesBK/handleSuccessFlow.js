const { createfilename } = require('../modulesBK/createXML');
const { firmaJava } = require('../modulesBK/firmaJava');
const { buildAttached } = require('../fnAttached/buildAttached');
const { sendMailToClient } = require('../fnAttached/sendMailToClient');
const fs = require('fs').promises;

const handleSuccessFlow = async (
  data,
  signed,
  responseDian,
  objRta,
  CUFE,
  folderName
) => {
  let nameAttached = '';
  if (data.cliente.nitCliente !== '222222222222') {
    const attached = buildAttached(
      signed,
      responseDian,
      data.cufe.ambient,
      data.derived.noFra,
      data.cufe.Nit,
      CUFE,
      objRta?.CodeValidation || '',
      data.cufe.FechaFactura,
      objRta?.fechaAppRes || '',
      objRta?.tiempoAppRes || '',
      data.cliente.nameCliente,
      data.cliente.nitCliente,
      data.cliente.dvCliente,
      data.cliente.tipoDocCliente
    );

    const fileInfo = await createfilename(
      data.cufe.FechaFactura,
      data.cufe.Nit,
      data.cufe.consAttached,
      'ad'
    );

    nameAttached = fileInfo.nameXML;

    const signedAttached = await firmaJava(nameAttached, attached);
    console.log('signedattahced', signedAttached);
    try {
      await sendMailToClient(
        data.cliente.mailCliente,
        data.cliente.nameCliente,
        signedAttached,
        nameAttached,
        CUFE,
        data.derived.noFra
      );
    } catch (emailError) {
      console.error('error al enviar correo al cliente', emailError);
    }
  }

  return {
    ok: objRta.isValid,
    mensaje: objRta.msg,
    datos: { CUFE, folderName, nameAttached },
    noDcto: data.cufe.idFactura,
    error: '',
  };
};

module.exports = handleSuccessFlow;
