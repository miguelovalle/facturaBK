const { parseXml } = require('../utils/xmlParser');
const { createXMLs } = require('../fnAttached/creatXMLs');
const { createfilename } = require('../modulesBK/createXML');
const { firmaJava } = require('../modulesBK/firmaJava');
const { sendmail } = require('../fnAttached/sendMail');

const attached = async (req, res) => {
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

    // Extraer datos necesarios
    const { cliente, emisor } = raiz.params;
    const data = {
      nombreCliente: cliente.nameClient,
      nitCliente: cliente.nitClient,
      dvcliente: cliente.DVclient,
      correo: cliente.mail,
      tipoDcto: cliente.tipoDcto,
      noFactura: emisor.noFra,
      fechaFactura: emisor.FFra,
      cufeFra: emisor.cufeFra,
      consecutivo: emisor.consecutivo,
      nombreEmisor: emisor.nombreEmisor,
      nitEmisor: emisor.nitEmisor,
      dvEmisor: emisor.dv,
      nameFra: emisor.nameXML,
    };

    const attachedXML = createXMLs(data);

    // asignar nombre al attached.xml
    const { nameXML, folderName } = await createfilename(
      data.fechaFactura,
      data.nitEmisor,
      data.consecutivo,
      'ad'
    );

    // firmar el attached.xml
    const attachedSigned = await firmaJava(nameXML, xmlUpdated);

    // enviar correo al cliente
    await sendmail(data.correo, emailSubject, emailContent);

  } catch (error) {
    console.error('Error en el procesamiento:', error);
    return res.status(500).json({
      ok: false,
      error: 'Error en el procesamiento',
      detalles: error.message,
    });
  }

  // recuperar appResponseDian

  // armar attached.xml

  // insertar factura.xml

  //insertar appresponseDian.xml

  // firmar attached.xml

  // armar correo

  // enviar correo al cliente

  //procesar respuesta

  res.json({ message: 'Response from appResponse' });
};

module.exports = { attached };
