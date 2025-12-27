const { response } = require('express');
const fs = require('fs');
const path = require('path');
const { parseXml } = require('../utils/xmlParser');
const { crearZIPadm, createfilename } = require('../modulesBK/createXML');
const { firmarSobre, enviarSobre } = require('../soapFns/soapFirma');
const { firmaJava } = require('../modulesBK/firmaJava');
const { procesaRtaDian } = require('../soapFns/procesaRtaDian');
const { sendMail } = require('../fnAttached/sendMail');
const { sendMailToClient } = require('../fnAttached/sendMailToClient');
const { buildAttached } = require('../fnAttached/buildAttached');
const AdmZip = require('adm-zip');

const reEnvios = async (req, res = response) => {
  // Objeto para mantener el estado de la respuesta (estandarizado)
  const respuesta = {
    ok: false,
    mensaje: '',
    datos: null,
    error: null,
  };

  try {
    // 1) Validar body
    if (!req.body) {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = { message: 'No se recibieron datos en la petición' };
      return res.status(400).json(respuesta);
    }

    // 2) Extraer parámetros desde XML
    let zipFilename, action, endPoint, testSetId, ambient;
    // Datos adicionales para construir attached y correo al cliente
    let NoFra = '',
      consAttached = '',
      FechaFactura = Date;
    (Nit = ''), (CUFE = '');
    let nameCliente = '',
      nitCliente = '',
      dvCliente = '',
      tipoDocCliente = '',
      mailCliente = '';
    try {
      const isXmlBody =
        typeof req.body === 'string' &&
        ((req.is && (req.is('application/xml') || req.is('text/xml'))) ||
          req.body.trim().startsWith('<'));
      if (isXmlBody) {
        const raiz = await parseXml(req.body);
        // Modelo flexible siguiendo patrón de dianDocs.js

        const params = raiz?.params || raiz || {};
        const { soft, cufe, cliente } = raiz.params;

        // const reenvio = params.reenvio || params.envio || params || {};
        endPoint = soft.endPoint || '';
        action = soft.action || '';
        testSetId = soft.testSetId || '';
        zipFilename = soft.zipFilename || '';
        Nit = soft.Nit || '';

        NoFra = cufe.NoFra || '';
        ambient = cufe.ambient || '';
        CUFE = cufe.CUFE || cufe.cufe || '';
        consAttached = cufe.consAttached || '';

        nameCliente = cliente.nameClient || '';
        nitCliente = cliente.nitClient || '';
        dvCliente = cliente.dvClient || '';
        mailCliente = cliente.mail || '';
        tipoDocCliente = cliente.tipoDctoClte || '';
      }
    } catch (parseErr) {
      respuesta.mensaje = 'Error al procesar el XML';
      respuesta.error = {
        message: parseErr.message,
        stack:
          process.env.NODE_ENV === 'development' ? parseErr.stack : undefined,
      };
      return res.status(400).json(respuesta);
    }

    // zipFilename: nombre del archivo ZIP dentro del directorio ./zips
    if (!zipFilename || typeof zipFilename !== 'string') {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message: 'Nombre de archivo ZIP no proporcionado. Envíe "zipFilename"',
      };
      return res.status(400).json(respuesta);
    }
    if (!zipFilename.toLowerCase().endsWith('.zip')) {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message: 'El nombre de archivo debe terminar en .zip',
      };
      return res.status(400).json(respuesta);
    }
    // Evitar rutas arbitrarias o traversal: solo nombre de archivo
    if (zipFilename.includes('/') || zipFilename.includes('\\')) {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message:
          'zipFilename debe ser únicamente el nombre del archivo dentro de ./zips (sin rutas)',
      };
      return res.status(400).json(respuesta);
    }

    // 3) Intentar leer el ZIP desde ./zips/<zipFilename>
    const zipPath = path.join('./zips', zipFilename);
    let zipBuffer;
    try {
      zipBuffer = await fs.promises.readFile(zipPath);
    } catch (err) {
      const e = new Error(
        `No se pudo leer el ZIP en ruta: ${zipPath}. Detalle: ${err.message}`
      );
      e.statusCode = err.code === 'ENOENT' ? 404 : 500;
      throw e;
    }

    // 4) Convertir a base64 para siguiente paso (sobre SOAP)
    const zip64 = zipBuffer.toString('base64');

    // 5) Validar parámetros para el envío a DIAN
    if (!action || typeof action !== 'string') {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = { message: 'Parámetro "action" es requerido' };
      return res.status(400).json(respuesta);
    }
    if (!endPoint || typeof endPoint !== 'string') {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = { message: 'Parámetro "endPoint" es requerido' };
      return res.status(400).json(respuesta);
    }
    if (!ambient || (ambient !== '1' && ambient !== '2')) {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message:
          'Parámetro "ambient" debe ser "1" (producción) o "2" (habilitación)',
      };
      return res.status(400).json(respuesta);
    }
    if (ambient === '2' && (!testSetId || typeof testSetId !== 'string')) {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message: 'En ambiente 2 (habilitación) "testSetId" es requerido',
      };
      return res.status(400).json(respuesta);
    }

    // 6) Firmar el sobre SOAP (usa zipFilename como folderName)
    let sobreFirmado;
    try {
      sobreFirmado = await firmarSobre(
        zipFilename, // folderName
        action,
        endPoint,
        testSetId || '',
        ambient,
        zip64
      );
      if (!sobreFirmado) {
        throw new Error('No se generó el sobre firmado');
      }
    } catch (error) {
      respuesta.mensaje = 'Error al firmar sobre SOAP';
      respuesta.error = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json(respuesta);
    }

    // 7) Enviar sobre a DIAN
    let soapResponseXml;
    try {
      soapResponseXml = await enviarSobre(action, endPoint, sobreFirmado);
    } catch (error) {
      respuesta.mensaje = 'Error al enviar sobre a DIAN';
      respuesta.error = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
      const statusCode = error.statusCode || 502;
      return res.status(statusCode).json(respuesta);
    }

    // 8) Procesar respuesta de DIAN y construir Attached si isValid=true
    try {
      // Determinar servicio según ambiente
      let webservice = '';
      switch (ambient) {
        case '1':
          webservice = 'SendBillSync';
          break;
        case '2':
          webservice = 'SendTestSetAsync';
          break;
        default:
          webservice = '';
      }

      const objRta = await procesaRtaDian(soapResponseXml, webservice);

      if (ambient === '1') {
        if (!objRta || objRta.isValid === false) {
          const description = objRta?.description ?? 'Sin descripción';
          const statusCode = objRta?.statusCode ?? 'Sin código';
          const errorList = Array.isArray(objRta?.errorList)
            ? objRta.errorList.join(', ')
            : 'N/A';

          // Aviso al ingeniero
          const options = {
            from: '"Marinos Bar Pescadero Restaurante" <tucorreo@gmail.com>',
            to: 'miguelovalleba@gmail.com',
            subject: 'Error en la factura electrónica (reEnvios)',
            text: `description: ${description} statusCode: ${statusCode} lista errores: ${errorList}`,
          };
          try {
            await sendMail(options);
          } catch (_) {}

          respuesta.ok = false;
          respuesta.mensaje = description + ' ' + statusCode;
          respuesta.datos = { zipFilename, ambient, action };
          respuesta.error = errorList;
          const httpStatusCode = 400;
          return res.status(httpStatusCode).json(respuesta);
        }

        // isValid === true: construir Attached y enviar correo
        // 8.1) Extraer XML firmado del ZIP para entregar al attached
        let signed = '';
        try {
          const zip = new AdmZip(zipBuffer);
          const entries = zip.getEntries();
          const xmlEntry = entries.find((e) =>
            e.entryName.toLowerCase().endsWith('.xml')
          );
          if (!xmlEntry) {
            throw new Error('No se encontró XML firmado dentro del ZIP');
          }
          signed = xmlEntry.getData().toString('utf8');
        } catch (err) {
          respuesta.mensaje = 'Error extrayendo XML firmado del ZIP';
          respuesta.error = { message: err.message };
          return res.status(500).json(respuesta);
        }

        // 8.2) Construir Attached
        let attached = '';
        try {
          attached = await buildAttached(
            signed,
            objRta?.xmlBase64 || '',
            ambient,
            NoFra || '',
            Nit || '',
            CUFE || '',
            objRta?.CodeValidation || '',
            FechaFactura || '',
            objRta?.fechaAppRes || '',
            objRta?.tiempoAppRes || '',
            nameCliente || '',
            nitCliente || '',
            dvCliente || '',
            tipoDocCliente || ''
          );
        } catch (err) {
          respuesta.mensaje = 'Error construyendo AttachedDocument';
          respuesta.error = { message: err.message };
          return res.status(500).json(respuesta);
        }

        // 8.3) Obtener nombre archivo Attached y firmarlo
        let nameAttached = '';
        try {
          const init = 'ad';
          const cons = consAttached || NoFra || '000000';
          const fileInfo = await createfilename(
            FechaFactura || '',
            Nit || '',
            cons,
            init
          );
          nameAttached = fileInfo.nameXML;
        } catch (err) {
          respuesta.mensaje = 'Error generando nombre de Attached';
          respuesta.error = { message: err.message };
          return res.status(500).json(respuesta);
        }

        let signedAttached = '';
        try {
          signedAttached = await firmaJava(nameAttached, attached);
        } catch (err) {
          respuesta.mensaje = 'Error al firmar AttachedDocument';
          respuesta.error = { message: err.message };
          return res.status(500).json(respuesta);
        }

        // 8.4) Enviar correo al cliente (si tenemos su email)
        try {
          if (mailCliente) {
            await sendMailToClient(
              mailCliente,
              nameCliente,
              signedAttached,
              nameAttached,
              CUFE || '',
              NoFra || ''
            );
          }
        } catch (emailErr) {
          // No bloqueamos el flujo por error de correo
          console.error('Error al enviar correo al cliente:', emailErr.message);
        }

        // 8.5) Respuesta exitosa
        respuesta.ok = true;
        respuesta.mensaje =
          objRta?.msg || 'Documento validado por DIAN y attached enviado';
        respuesta.datos = {
          zipFilename,
          ambient,
          action,
          nameAttached,
        };
        respuesta.error = null;
        return res.status(200).json(respuesta);
      }

      // Ambiente 2: habilitación
      if (ambient === '2') {
        respuesta.ok = true;
        respuesta.mensaje =
          objRta?.msg || 'Sobre enviado en ambiente de habilitación';
        respuesta.datos = {
          zipFilename,
          ambient,
          action,
          apikey: objRta?.apikey || '',
        };
        respuesta.error = null;
        return res.status(200).json(respuesta);
      }
    } catch (error) {
      respuesta.mensaje = 'Error al procesar la respuesta de DIAN';
      respuesta.error = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      };
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json(respuesta);
    }
  } catch (error) {
    // Manejo de error con estructura consistente
    respuesta.ok = false;
    respuesta.mensaje = 'Error leyendo ZIP';
    respuesta.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json(respuesta);
  }
};

module.exports = { reEnvios };

// Reenvío desde archivo ZIP (contingencia recuperada)
// Body esperado (JSON o XML equivalente):
// {
//   zipPath: 'c:/.../xmlFiles/Contingentes/zXXXXXXXX.zip',
//   // Compatibilidad: también se admite base64Path con ruta a doc_base64.txt
//   fileName: 'zXXXXXXXX.zip',
//   endPoint: 'https://...',
//   ambient: '1',
//   NoFra, consAttached, FechaFactura, Nit, CUFE,
//   nameCliente, nitCliente, dvCliente, tipoDocCliente, mailCliente
// }
const reenviarContingente = async (req, res = response) => {
  const respuesta = {
    ok: false,
    mensaje: '',
    datos: null,
    error: null,
  };

  try {
    if (!req.body) {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = { message: 'No se recibieron datos en la petición' };
      respuesta.http = { status: 400 };
      return res.status(400).json(respuesta);
    }

    // Extraer parámetros básicos
    let zipPath = '',
      base64Path = '',
      fileName = '',
      endPoint = '',
      ambient = '';
    let NoFra = '',
      consAttached = '',
      FechaFactura = '',
      Nit = '',
      CUFE = '';
    let nameCliente = '',
      nitCliente = '',
      dvCliente = '',
      tipoDocCliente = '',
      mailCliente = '';
    try {
      const isXmlBody =
        typeof req.body === 'string' &&
        ((req.is && (req.is('application/xml') || req.is('text/xml'))) ||
          req.body.trim().startsWith('<'));
      if (isXmlBody) {
        const raiz = await parseXml(req.body);
        const params = raiz?.params || raiz || {};
        const reenvio = params.reenvio || params.envio || params || {};
        zipPath = reenvio.zipPath || '';
        base64Path = reenvio.base64Path || '';
        fileName = reenvio.fileName || '';
        endPoint = reenvio.endPoint || params.soft?.endPoint || '';
        ambient = reenvio.ambient || params.cufe?.ambient || '';

        const cufe = params.cufe || {};
        const cliente = params.cliente || {};
        NoFra = cufe.NoFra || '';
        consAttached = cufe.consAttached || '';
        FechaFactura = cufe.FechaFactura || '';
        Nit = cufe.Nit || '';
        CUFE = cufe.CUFE || cufe.cufe || '';

        nameCliente = cliente.nameClient || '';
        nitCliente = cliente.nitClient || '';
        dvCliente = cliente.dvClient || '';
        tipoDocCliente = cliente.tipoDctoClte || '';
        mailCliente = cliente.mail || '';
      } else {
        ({
          zipPath,
          base64Path,
          fileName,
          endPoint,
          ambient,
          NoFra,
          consAttached,
          FechaFactura,
          Nit,
          CUFE,
          nameCliente,
          nitCliente,
          dvCliente,
          tipoDocCliente,
          mailCliente,
        } = req.body);
      }
    } catch (parseErr) {
      respuesta.mensaje = 'Error al procesar el cuerpo de la petición';
      respuesta.error = { message: parseErr.message };
      respuesta.http = { status: 400 };
      return res.status(400).json(respuesta);
    }

    // Validaciones
    const providedPath = zipPath || base64Path;
    if (!providedPath || typeof providedPath !== 'string') {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message:
          'Debe proporcionar "zipPath" con ruta al archivo .zip (o "base64Path" como compatibilidad)',
      };
      respuesta.http = { status: 400 };
      return res.status(400).json(respuesta);
    }
    if (!endPoint || typeof endPoint !== 'string') {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = { message: 'Parámetro "endPoint" es requerido' };
      respuesta.http = { status: 400 };
      return res.status(400).json(respuesta);
    }
    if (!ambient || ambient !== '1') {
      respuesta.mensaje = 'Error de validación';
      respuesta.error = {
        message: 'Reenvío de contingencia requiere ambient="1" (producción)',
      };
      respuesta.http = { status: 400 };
      return res.status(400).json(respuesta);
    }

    // Leer ZIP desde disco y convertir a base64 (o compatibilidad: leer base64.txt)
    let zip64 = '';
    let zipBuffer;
    try {
      const pathToRead = zipPath || base64Path;
      const normalizedPath = path.isAbsolute(pathToRead)
        ? pathToRead
        : path.resolve(process.cwd(), pathToRead);
      if (zipPath) {
        // Leer ZIP binario y convertir a base64
        const fileBuffer = await fs.promises.readFile(normalizedPath);
        zipBuffer = fileBuffer;
        zip64 = fileBuffer.toString('base64');
      } else {
        // Compatibilidad: leer base64 desde archivo .txt
        zip64 = await fs.promises.readFile(normalizedPath, 'utf8');
        zipBuffer = Buffer.from(zip64, 'base64');
      }
      if (!fileName) {
        // Generar nombre ZIP por defecto si no viene
        const fallback =
          'z' +
          (Nit || '0000000000').toString().padStart(10, 0) +
          '000' +
          (FechaFactura ? FechaFactura.slice(2, 4) : '00') +
          (consAttached || '00000000') +
          '.zip';
        fileName = fallback;
      }
    } catch (err) {
      const e = new Error(
        `No se pudo leer ${zipPath ? 'ZIP' : 'base64'} desde: ${
          zipPath || base64Path
        }. Detalle: ${err.message}`
      );
      e.statusCode = err.code === 'ENOENT' ? 404 : 500;
      throw e;
    }

    // Firmar y enviar sobre SOAP con SendBillSync
    const action = 'SendBillSync';
    let sobreFirmado;
    try {
      sobreFirmado = await firmarSobre(
        fileName,
        action,
        endPoint,
        '',
        ambient,
        zip64
      );
      if (!sobreFirmado) throw new Error('No se generó el sobre firmado');
    } catch (error) {
      respuesta.mensaje = 'Error al firmar sobre SOAP';
      respuesta.error = { message: error.message };
      const statusCode = error.statusCode || 500;
      respuesta.http = { status: statusCode };
      return res.status(statusCode).json(respuesta);
    }

    let soapResponseXml;
    try {
      soapResponseXml = await enviarSobre(action, endPoint, sobreFirmado);
    } catch (error) {
      // Si DIAN devuelve HTML 500, lo propagamos como 500
      respuesta.mensaje = 'Error al enviar sobre a DIAN';
      respuesta.error = { message: error.message };
      const statusCode = error.statusCode || 502;
      respuesta.http = { status: statusCode };
      return res.status(statusCode).json(respuesta);
    }

    // Procesar respuesta de DIAN
    try {
      const webservice = 'SendBillSync';
      const objRta = await procesaRtaDian(soapResponseXml, webservice);

      if (!objRta || objRta.isValid === false) {
        const description =
          objRta?.description || objRta?.msg || 'Sin descripción';
        const statusCode = objRta?.statusCode ?? 'Sin código';
        const errorList = Array.isArray(objRta?.errorList)
          ? objRta.errorList
          : objRta?.errorList
          ? [objRta.errorList]
          : [];

        // Informar al ingeniero
        const options = {
          from: '"Marinos Bar Pescadero Restaurante" <tucorreo@gmail.com>',
          to: 'miguelovalleba@gmail.com',
          subject: 'Error en reenvío de contingencia',
          text: `description: ${description} statusCode: ${statusCode} lista errores: ${errorList.join(
            ', '
          )}`,
        };
        try {
          await sendMail(options);
        } catch (_) {}

        respuesta.ok = false;
        respuesta.mensaje = objRta?.msg || `${description} ${statusCode}`;
        respuesta.datos = { fileName, zipPath, base64Path };
        respuesta.error = {
          message: 'DIAN rechazó el documento',
          details: {
            description,
            statusCode,
            errorList,
            ...(objRta?.msg ? { msg: objRta.msg } : {}),
          },
        };
        respuesta.http = { status: 502 };
        return res.status(502).json(respuesta);
      }

      // isValid === true: construir attached y enviar correo
      // Extraer XML firmado del ZIP (a partir de base64)
      let signed = '';
      try {
        const zip = new AdmZip(zipBuffer);
        const entries = zip.getEntries();
        const xmlEntry = entries.find((e) =>
          e.entryName.toLowerCase().endsWith('.xml')
        );
        if (!xmlEntry)
          throw new Error('No se encontró XML firmado dentro del ZIP');
        signed = xmlEntry.getData().toString('utf8');
      } catch (err) {
        respuesta.mensaje = 'Error extrayendo XML firmado del ZIP';
        respuesta.error = { message: err.message };
        respuesta.http = { status: 500 };
        return res.status(500).json(respuesta);
      }

      // Construir Attached
      let attached = '';
      try {
        attached = await buildAttached(
          signed,
          objRta?.xmlBase64 || '',
          ambient,
          NoFra || '',
          Nit || '',
          CUFE || '',
          objRta?.CodeValidation || '',
          FechaFactura || '',
          objRta?.fechaAppRes || '',
          objRta?.tiempoAppRes || '',
          nameCliente || '',
          nitCliente || '',
          dvCliente || '',
          tipoDocCliente || ''
        );
      } catch (err) {
        respuesta.mensaje = 'Error construyendo AttachedDocument';
        respuesta.error = { message: err.message };
        respuesta.http = { status: 500 };
        return res.status(500).json(respuesta);
      }

      // Nombre y firma del attached
      let nameAttached = '';
      try {
        const init = 'ad';
        const cons = consAttached || NoFra || '000000';
        const fileInfo = await createfilename(
          FechaFactura || '',
          Nit || '',
          cons,
          init
        );
        nameAttached = fileInfo.nameXML;
      } catch (err) {
        respuesta.mensaje = 'Error generando nombre de Attached';
        respuesta.error = { message: err.message };
        respuesta.http = { status: 500 };
        return res.status(500).json(respuesta);
      }

      let signedAttached = '';
      try {
        signedAttached = await firmaJava(nameAttached, attached);
      } catch (err) {
        respuesta.mensaje = 'Error al firmar AttachedDocument';
        respuesta.error = { message: err.message };
        respuesta.http = { status: 500 };
        return res.status(500).json(respuesta);
      }

      // Enviar correo al cliente si hay email
      try {
        if (mailCliente) {
          await sendMailToClient(
            mailCliente,
            nameCliente,
            signedAttached,
            nameAttached,
            CUFE || '',
            NoFra || ''
          );
        }
      } catch (emailErr) {
        console.error('Error al enviar correo al cliente:', emailErr.message);
        // No bloqueamos la respuesta por error de correo
      }

      respuesta.ok = true;
      respuesta.mensaje =
        objRta?.msg ||
        'Documento de contingencia validado por DIAN y attached enviado';
      respuesta.datos = { fileName, zipPath, base64Path, nameAttached };
      respuesta.error = null;
      respuesta.http = { status: 200 };
      return res.status(200).json(respuesta);
    } catch (error) {
      respuesta.mensaje = 'Error al procesar respuesta de DIAN';
      respuesta.error = { message: error.message };
      const statusCode = error.statusCode || 500;
      respuesta.http = { status: statusCode };
      return res.status(statusCode).json(respuesta);
    }
  } catch (error) {
    respuesta.ok = false;
    respuesta.mensaje = 'Error en reenvío de contingencia';
    respuesta.error = { message: error.message };
    const statusCode = error.statusCode || 500;
    respuesta.http = { status: statusCode };
    return res.status(statusCode).json(respuesta);
  }
};

module.exports.reenviarContingente = reenviarContingente;
