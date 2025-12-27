const { parseXml } = require('../utils/xmlParser');
const {
  generarHashSHA384,
  actualizaCUFE,
  createfilename,
} = require('../modulesBK/createXML');

function toBool(v) {
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'si' || s === 'yes' || s === 'on';
  }
  if (typeof v === 'number') return v === 1;
  return false;
}

function withTimeout(promise, ms, label = 'timeout') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const err = new Error(`${label} tras ${ms} ms`);
      err.code = 'TIMEOUT';
      err.label = label;
      reject(err);
    }, ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

const sendResponse = (res, status, data) => {
  // Ensure default structure
  const response = {
    ok: data.ok || false,
    mensaje: data.mensaje || '',
    datos: data.datos || {},
    error: data.error || '',
    evento: data.evento || '',
    noDcto: data.noDcto || '',
    http: { status },
  };

  // If headers sent, just log (shouldn't happen with careful flow control)
  if (res.headersSent) {
    console.warn('Headers already sent, cannot send response:', response);
    return;
  }

  return res.status(status).json(response);
};

const parseAndExtractData = async (xmlBody) => {
  let raiz;
  try {
    raiz = await parseXml(xmlBody);
  } catch (error) {
    throw new Error(`Error al procesar el XML: ${error.message}`);
  }

  const { soft, cufe, cliente } = raiz.params;

    // Extract and normalize data
  const data = {
    soft: {
      softid: soft.softid || '',
      pin: soft.pin || '',
      init: soft.initName || '',
      endPoint: soft.endPoint || '',
      action: soft.action || '',
      testSetId: soft.testSetId || '',
      contingencia: toBool(soft?.contingencia) || false,
    },
    cufe: {
      idFactura: cufe.idFactura || '',
      prefijo: cufe.prefijo || '',
      consAttached: cufe.consAttached || '',
      consecutivo: cufe.consecutivo || '',
      FechaFactura: cufe.FechaFactura || '',
      HoraFactura: cufe.HoraFactura || '',
      VrBase: cufe.VrBase || '',
      Imp: cufe.Imp || '',
      VrTotal: cufe.VrTotal || '',
      Nit: cufe.Nit || '',
      claveTc: cufe.claveTc || '',
      ambient: cufe.ambient || '',
    },
    cliente: {
      nameCliente: cliente.nameClient || '',
      nitCliente: cliente.nitClient || '',
      dvCliente: cliente.dvClient || '',
      mailCliente: cliente.mail || '',
      tipoDocCliente: cliente.tipoDctoClte || '',
    },
    derived: {
      noFra: (cufe.prefijo || '') + (cufe.idFactura || ''),
    },
  };

  // Validate required fields
  const camposRequeridos = {
    softid: {
      valor: data.soft.softid,
      mensaje: 'ID del software no proporcionado',
    },
    pin: { valor: data.soft.pin, mensaje: 'PIN no proporcionado' },
    idFactura: {
      valor: data.cufe.idFactura,
      mensaje: 'Número de factura no proporcionado',
    },
    Nit: { valor: data.cufe.Nit, mensaje: 'NIT no proporcionado' },
    VrTotal: {
      valor: data.cufe.VrTotal,
      mensaje: 'Valor total no proporcionado',
    },
    FechaFactura: {
      valor: data.cufe.FechaFactura,
      mensaje: 'Fecha de factura no proporcionada',
    },
    HoraFactura: {
      valor: data.cufe.HoraFactura,
      mensaje: 'Hora de factura no proporcionada',
    },
  };

  const errores = [];
  for (const [campo, { valor, mensaje }] of Object.entries(camposRequeridos)) {
    if (!valor) errores.push({ campo, mensaje });
  }

  if (errores.length > 0) {
    const err = new Error('Campos requeridos ausentes o inválidos');
    err.validationErrors = errores;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Determine Doc Type
  let tyeDoc;
  switch (data.soft.init) {
    case 'fv':
      tyeDoc = 'Invoice';
      break;
    case 'nc':
      tyeDoc = 'CreditNote';
      data.cufe.claveTc = data.soft.pin;
      break;
    case 'nd':
      tyeDoc = 'DebitNote';
      data.cufe.claveTc = data.soft.pin;
      break;
    default:
      break;
  }
  data.derived.tyeDoc = tyeDoc;

  return data;
};

const generateCodes = async (data) => {
  try {
    const softCode = await generarHashSHA384(
      data.soft.softid + data.soft.pin + data.derived.noFra
    );

    const cufeString =
      data.derived.noFra +
      data.cufe.FechaFactura +
      data.cufe.HoraFactura +
      data.cufe.VrBase +
      '010.00' +
      '04' +
      data.cufe.Imp +
      '030.00' +
      data.cufe.VrTotal +
      data.cufe.Nit +
      data.cliente.nitCliente +
      data.cufe.claveTc +
      data.cufe.ambient;
    
      console.log("string para calculo cufe", cufeString);

    const CUFE = await generarHashSHA384(cufeString);

    console.log("CUFE RECIEN calculado:", CUFE);
    
    return { softCode, CUFE };
  } catch (error) {
    throw new Error(`Error generando códigos (Hash/CUFE): ${error.message}`);
  }
};

const prepareFiles = async (data, softCode, CUFE) => {

  console.log("cufe que llega a prepare files", CUFE);

  try {
    const xmlUpdated = await actualizaCUFE(
      softCode,
      CUFE,
      data.derived.tyeDoc,
      data.cufe.ambient
    );
    const fileInfo = await createfilename(
      data.cufe.FechaFactura,
      data.cufe.Nit,
      data.cufe.consecutivo,
      data.soft.init
    );
    return {
      xmlUpdated,
      nameXML: fileInfo.nameXML,
      folderName: fileInfo.folderName,
    };
  } catch (error) {
    throw new Error(`Error preparando archivos XML: ${error.message}`);
  }
};

module.exports = {
  toBool,
  withTimeout,
  sendResponse,
  parseAndExtractData,
  generateCodes,
  prepareFiles,
};
