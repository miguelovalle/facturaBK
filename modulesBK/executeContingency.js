const { firmaJava } = require('./firmaJava');
const { crearZIPadm, createfilename } = require('./createXML');
const { buildAttached } = require('../fnAttached/buildAttached');
const { sendMailToClient } = require('../fnAttached/sendMailToClient');

const executeContingency = async (
  data,
  xmlUpdated,
  nameXML,
  folderName,
  CUFE,
  reasonMsg
) => {
  try {
    let xmlCont = xmlUpdated;
    if (data.derived.tyeDoc === 'Invoice') {
      xmlCont = xmlUpdated.replace(
        /<cbc:InvoiceTypeCode>\s*01\s*<\/cbc:InvoiceTypeCode>/,
        '<cbc:InvoiceTypeCode>04</cbc:InvoiceTypeCode>'
      );
    }

    const signedCont = await firmaJava(
      nameXML,
      xmlCont,
      './xmlFiles/Contingentes'
    );

    await crearZIPadm(signedCont, nameXML, folderName, {
      outZipDir: './xmlFiles/Contingentes',
      outBase64Path: './xmlFiles/Contingentes/doc_base64.txt',
    });

    const attachedCont = await buildAttached(
      signedCont,
      '',
      data.cufe.ambient,
      data.derived.noFra,
      data.cufe.Nit,
      CUFE,
      '', // CodeValidation
      data.cufe.FechaFactura,
      '',
      '', // fechaAppRes, tiempoAppRes
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
    const nameAttached = fileInfo.nameXML;

    const signedAttached = await firmaJava(
      nameAttached,
      attachedCont,
      './xmlFiles/Contingentes'
    );

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
      console.error(
        'Error al enviar correo al cliente (contingencia):',
        emailError
      );
    }

    return {
      ok: true, // Contingency is considered a success for the client flow
      mensaje:
        reasonMsg ||
        'Contingencia: documento emitido en 04 y enviado al cliente',
      datos: { CUFE, folderName, contingencia: true },
      noDcto: data.cufe.idFactura,
      error: '',
    };
  } catch (contErr) {
    const err = new Error(
      `Error en emisión en contingencia: ${contErr.message}`
    );
    err.originalError = contErr;
    err.statusCode = contErr.statusCode || 500;
    throw err;
  }
};

module.exports = executeContingency;
