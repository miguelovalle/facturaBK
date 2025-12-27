const { response } = require('express');
const { firmaJava } = require('../modulesBK/firmaJava');
const { procesaRtaDian } = require('../soapFns/procesaRtaDian');
const { sendMail } = require('../fnAttached/sendMail');
const { executeContingency } = require('../modulesBK/executeContingency');
const { sendToDian } = require('../modulesBK/sendToDian');
const handleSuccessFlow = require('../modulesBK/handleSuccessFlow');
const fs = require('fs');
const path = require('path');
const {
  toBool,
  sendResponse,
  parseAndExtractData,
  generateCodes,
  prepareFiles,
} = require('../helpers/utils');

const validateInput = (req) => {
  if (!req.body) throw new Error('No se recibieron datos en la petición');
};

// --- Main Controller ---

const envioDian = async (req, res = response) => {
  // Global state for timeout handling
  let responded = false;
  const processTimeoutMs = Number(
    process.env.EXPRESS_PROCESS_TIMEOUT_MS || 60000
  );
  const dianTimeoutMs = Number(process.env.DIAN_TIMEOUT_MS || 30000);

  // Safety timeout
  const processTimer = setTimeout(() => {
    if (!responded) {
      responded = true;
      sendResponse(res, 408, {
        ok: false,
        mensaje: 'Demora: el proceso no terminó en tiempo esperado',
        evento: 'demora_Server_Local',
        datos: { CUFE: undefined }, // Partial data if available? Hard to pass here without closure scope
      });
    }
  }, processTimeoutMs);

  const safeSend = (status, data) => {
    if (responded) return;
    responded = true;
    clearTimeout(processTimer);
    sendResponse(res, status, data);
  };

  try {
    validateInput(req);

    // 1. Prepare Data
    const data = await parseAndExtractData(req.body);

    // 2. Generate Codes
    const { softCode, CUFE } = await generateCodes(data);

    // 3. Prepare Files
    const { xmlUpdated, nameXML, folderName } = await prepareFiles(
      data,
      softCode,
      CUFE
    );

    // 4. Check Contingency (Requested or Env)
    if (data.soft.contingencia || toBool(process.env.DIAN_CONTINGENCIA)) {
      const result = await executeContingency(
        data,
        xmlUpdated,
        nameXML,
        folderName,
        CUFE
      );
      return safeSend(200, result);
    }

    // 5. Sign Document
    let signed;
    try {
      signed = await firmaJava(nameXML, xmlUpdated);
    } catch (error) {
      throw new Error(`Error al firmar el documento: ${error.message}`);
    }

    // 6. Send to DIAN
    let responseDian;
    let intentoEnvioDian = false;
    let rtaDianRecibida = false;

    try {
      intentoEnvioDian = true;
      responseDian = await sendToDian(
        data,
        signed,
        nameXML,
        folderName,
        dianTimeoutMs
      );

      console.log('respuesta DIAN: ', responseDian);

      rtaDianRecibida = true;
    } catch (error) {
      if (error.code === 'TIMEOUT') {
        return safeSend(504, {
          ok: false,
          mensaje: 'Demora: DIAN no respondió dentro del tiempo configurado',
          evento: 'demora_dian',
          datos: {
            CUFE,
            folderName,
            envio_dian_intentado: intentoEnvioDian,
            rta_dian_recibida: rtaDianRecibida,
          },
        });
      }
      throw error;
    }

    // 7. Process DIAN Response
    const webservice = data.soft.action;

    const objRta = await procesaRtaDian(responseDian, webservice);

    console.log('objRta procesada: ', objRta);

    // 8. Handle Production Errors (Fallback to Contingency)
    if (data.cufe.ambient === '1') {
      if (!objRta || objRta.isValid === false) {
        // estando en ambiente habilitacion, no recibe respuesta Dian y lanza conrtingencia
        const description =
          objRta?.description || objRta?.msg || 'Sin descripción';
        const statusCode = objRta?.statusCode ?? 'Sin código';
        const errorList = Array.isArray(objRta?.errorList)
          ? objRta.errorList
          : objRta?.errorList
          ? [objRta.errorList]
          : [];
        const numericStatus = Number(statusCode);

        // If server error (>= 500), try contingency
        if (!Number.isNaN(numericStatus) && numericStatus >= 500) {
          try {
            const contResult = await executeContingency(
              data,
              xmlUpdated,
              nameXML,
              folderName,
              CUFE,
              'DIAN con error (>=500). Documento emitido en contingencia (04) y enviado al cliente'
            );

            // Enrich contingency result with original error details
            contResult.ok = false; // It's a failure of the primary flow, even if contingency worked
            contResult.error = {
              message: 'DIAN no disponible o con error de servidor',
              details: {
                description,
                statusCode,
                errorList,
                ...(objRta?.msg ? { msg: objRta.msg } : {}),
              },
            };
            return safeSend(502, contResult);
          } catch (contErr) {
            // Contingency also failed
            return safeSend(502, {
              ok: objRta?.isValid || false,
              mensaje: objRta?.msg || `${description} ${statusCode}`,
              datos: { CUFE, folderName },
              noDcto: data.cufe.idFactura,
              error: {
                message: 'Fallo contingencia tras error de DIAN',
                details: {
                  description,
                  statusCode,
                  errorList,
                  ...(objRta?.msg ? { msg: objRta.msg } : {}),
                },
              },
            });
          }
        } else {
          // Rejection (Client Error or Business Rule)
          // Send email to engineer (commented out in original, kept consistent)

          const options = {
            from:
              '"Marinos Bar Pescadero Restaurante" <' +
              (process.env.GMAIL_USER || 'femarinosbar@gmail.com') +
              '>',
            to: 'miguelovalleba@gmail.com',
            subject: 'Error en la factura electrónica',
            text: `description: ${description} statusCode: ${statusCode} lista errores: ${errorList.join(
              ', '
            )}`,
          };
          try {
            await sendMail(options);
          } catch (e) {}

          return safeSend(502, {
            ok: objRta?.isValid || false,
            mensaje: objRta?.msg || `${description} ${statusCode}`,
            datos: { CUFE, folderName },
            noDcto: data.cufe.idFactura,
            error: {
              message: 'DIAN rechazó el documento',
              details: {
                description,
                statusCode,
                errorList,
                ...(objRta?.msg ? { msg: objRta.msg } : {}),
              },
            },
          });
        }
      } else {
        // Flujo si DIAN responde OK en producción
        // Responder inmediatamente al cliente y ejecutar tareas posteriores en segundo plano
        const result = {
          ok: objRta.isValid,
          mensaje: objRta.msg,
          datos: { CUFE, folderName },
          noDcto: data.cufe.idFactura,
          error: '',
        };
        safeSend(200, result);

        // Ejecutar tareas de post-proceso sin bloquear la respuesta HTTP
        (async () => {
          try {
            await handleSuccessFlow(
              data,
              signed,
              responseDian,
              objRta,
              CUFE,
              folderName
            );
          } catch (postErr) {
            console.error('Error en flujo posterior al éxito:', postErr);
          }
        })();
        return;
      }
    }

    // 9. Test Environment Success
    return safeSend(200, {
      ok: true,
      mensaje: objRta?.msg || 'Enviado en ambiente de pruebas',
      datos: { CUFE, folderName, apikey: objRta?.apikey || '' },
      noDcto: data.cufe.idFactura,
      error: '',
    });
  } catch (error) {
    // Top Level Error Handler

    // Send email to engineer
    const options = {
      from:
        '"Marinos Bar Pescadero Restaurante" <' +
        (process.env.GMAIL_USER || 'femarinosbar@gmail.com') +
        '>',
      to: 'miguelovalleba@gmail.com',
      subject: 'Error en la factura electrónica',
      text: `Error en el proceso: ${error.message}`,
    };
    try {
      await sendMail(options);
    } catch (e) {
      console.error('Error mail ingeniero:', e);
    }

    const statusCode =
      error.statusCode || (error.code === 'VALIDATION_ERROR' ? 422 : 500);

    return safeSend(statusCode, {
      ok: false,
      mensaje:
        error.code === 'VALIDATION_ERROR'
          ? 'Error de validación'
          : 'Error en el proceso de facturación electrónica',
      datos: { CUFE: undefined }, // We might not have CUFE/folderName if error happened early
      noDcto: '', // Might not have it
      error: {
        message: error.message,
        details:
          process.env.NODE_ENV === 'development'
            ? { stack: error.stack, validation: error.validationErrors }
            : error.validationErrors,
      },
    });
  }
};
module.exports = { envioDian };
