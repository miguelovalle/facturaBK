const { response } = require('express');
const { parseXml } = require('../utils/xmlParser');
const {
  generarHashSHA384,
  createfilename,
  actualizaCUFE,
  crearZIPadm,
} = require('../modulesBK/createXML');

//const { signFile } = require('../modulesBK/firmar');
const { firmarSobre, enviarSobre } = require('../soapFns/soapFirma');
const { firmaJava } = require('../modulesBK/firmaJava');
const { procesaRtaDian } = require('../soapFns/procesaRtaDian');

const envioDian = async (req, res = response) => {
  try {
    let raiz;
    try {
      raiz = await parseXml(req.body);
    //  console.log('XML parseado correctamente:', JSON.stringify(raiz, null, 2));
    } catch (error) {
      console.error('Error al parsear XML:', error);
      return res.status(400).json({
        ok: false,
        error: 'Error al procesar el XML',
        detalles: error.message,
      });
    }
    //  Extraer datos con valores por defecto
    const { soft, cufe } = raiz.params;

    const softid = soft.softid || '';
    const pin = soft.pin || '';
    const nodctos = soft.nodctos || '';
    const init = soft.initName || '';
    const action = soft.action || '';
    const endPoint = soft.endPoint || '';
    const testSetId = soft.testSetId || '';

    const NoFra = cufe.NoFra || '';
    const consecutivo = cufe.consecutivo || '';
    const FechaFactura = cufe.FechaFactura || '';
    const HoraFactura = cufe.HoraFactura || '';
    const VrBase = cufe.VrBase || '';
    const Imp = cufe.Imp || '';
    const VrTotal = cufe.VrTotal || '';
    const Nit = cufe.Nit || '';
    const cc = cufe.cc || '';
    let claveTc = cufe.claveTc || '';
    const ambient = cufe.ambient || '';

    // 6. Validar campos obligatorios
    const camposRequeridos = {
      softid,
      pin,
      NoFra,
      Nit,
      VrTotal,
      FechaFactura,
      HoraFactura,
    };

    const faltantes = Object.entries(camposRequeridos)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (faltantes.length > 0) {
      console.log('Campos requeridos faltantes:', faltantes);
      return res.status(400).json({
        ok: false,
        error: 'Faltan campos obligatorios',
        camposFaltantes: faltantes,
      });
    }

    let tyeDoc;
    switch (init) {
      case 'fv':
        tyeDoc = 'Invoice';
        break;
      case 'nc':
        tyeDoc = 'CreditNote';
        claveTc = pin;
        break;
      case 'nd':
        tyeDoc = 'DebitNote';
        claveTc = pin;
        break;
      default:
        break;
    }

    const softCode = await generarHashSHA384(softid + pin + NoFra);
    const CUFE = await generarHashSHA384(
      NoFra +
        FechaFactura +
        HoraFactura +
        VrBase +
        '010.00' +
        '04' +
        Imp +
        '030.00' +
        VrTotal +
        Nit +
        cc +
        claveTc +
        ambient
    );
    console.log('CUFE', CUFE);

    let xmlUpdated = await actualizaCUFE(softCode, CUFE, tyeDoc);

    const { nameXML, folderName } = await createfilename(
      FechaFactura,
      Nit,
      consecutivo,
      init
    );
    const signed = await firmaJava(nameXML, xmlUpdated);
    //const signed = await signFile(nameXML, xmlUpdated);

    //empaquetar en zip
    await crearZIPadm(signed, nameXML, folderName);
    // Generar Sobre Firmado
    const sobreFirmado = await firmarSobre(
      folderName,
      action,
      endPoint,
      testSetId,
      ambient
    );
    // envio a DIAN
    const response = await enviarSobre(action, endPoint, sobreFirmado);

    // procesa la respuesta
    const objRta = await procesaRtaDian(response);
    objRta.CUFE = CUFE;
    objRta.nameXML = nameXML;
    objRta.folderName = folderName;
   // console.log('respuesta', objRta);
    //en la respuesta del envio a la dian viene un xml con la respunesta. si la respuesta es aprobado, deveulve el cufe
    // si la respuesta es rechazada, devuelve el nombre del xml firmado
    console.log('Proceso completado exitosamente');
    res.status(200).json(objRta);
  } catch (error) {
    console.error('Error en envioDian:', error);
    objRta.msg = 'Error en procesamiento de la firma';
    res.status(500).json(objRta);
  }
};
module.exports = { envioDian };
