const { response } = require('express');
const {
  generarHashSHA384,
  createfilename,
  actualizaCUFE,
  crearZIPadm,
} = require('../modulesBK/createXML');

const { signFile } = require('../modulesBK/firmar');
const fs = require('fs');
const { firmarSobre, enviarSobre } = require('../soapFns/soapFirma');
const { firmaJava } = require('../modulesBK/firmaJava');

const notaContable = async (req, res = response) => {
  try {
    //extraer data para calcular CUFE y softcode
    const raiz = req.body.params;
    const softid = raiz.soft[0].softid[0];
    const pin = raiz.soft[0].pin[0];
    const nodctos = raiz.soft[0].nodctos[0];
    const init = raiz.soft[0].initName[0];
    const action = raiz.soft[0].action[0];
    const endPoint = raiz.soft[0].endPoint[0];
    const testSetId = raiz.soft[0].testSetId[0];
    const NoFra = raiz.cufe[0].NoFra[0];
    const consecutivo = raiz.cufe[0].consecutivo[0];
    const FechaFactura = raiz.cufe[0].FechaFactura[0];
    const HoraFactura = raiz.cufe[0].HoraFactura[0];
    const VrBase = raiz.cufe[0].VrBase[0];
    const Imp = raiz.cufe[0].Imp[0];
    const VrTotal = raiz.cufe[0].VrTotal[0];
    const Nit = raiz.cufe[0].Nit[0];
    const cc = raiz.cufe[0].cc[0];
    const claveTc = raiz.cufe[0].claveTc[0];
    const ambient = raiz.cufe[0].ambient[0];

    // calcular softcode y CUFE
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
    let tyeDoc;
    switch (init) {
      case 'fv':
        tyeDoc = 'Invoice';
        break;
      case 'nc':
        tyeDoc = 'CreditNote';
        break;
      case 'nd':
        tyeDoc = 'DebitNote';
        break;
      default:
        break;
    }

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
      testSetId
    );
    // envio a DIAN
    await enviarSobre(action, endPoint, sobreFirmado);

    //en la respuesta del envio a la dian viene un xml con la respuesta. si la respuesta es aprobado, deveulve el cufe
    // si la respuesta es rechazada, devuelve el nombre del xml firmado
    res.status(200).send(CUFE);
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: 'Favor comunicarse con el administrador',
    });
  }
};

module.exports = { envioDian };
