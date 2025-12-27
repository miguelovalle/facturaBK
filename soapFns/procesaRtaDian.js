const { parseXml } = require('../utils/xmlParser');
const { fechaAttached } = require('./fechaAttached');

// Utilidad: busca una clave ignorando prefijos de namespace (a:, b:, s:, etc.)
const pickBySuffix = (obj, suffix) => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const key of Object.keys(obj)) {
    const base = key.includes(':') ? key.split(':').pop() : key;
    if (base === suffix) return obj[key];
  }
  return undefined;
};

// Normaliza booleanos (acepta 'true'/'false' strings)
const toBoolean = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return Boolean(val);
};

// Normaliza listas de errores a array de strings
const normalizeErrors = (errRaw) => {
  if (!errRaw) return [];
  const arr = Array.isArray(errRaw) ? errRaw : [errRaw];
  return arr
    .map((e) => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object') {
        // Intentar tomar alguna propiedad común
        const vals = Object.values(e).filter((v) => v);
        return vals.length ? String(vals[0]) : JSON.stringify(e);
      }
      return String(e);
    })
    .filter(Boolean);
};

const procesaRtaDian = async (xmlResponse, webservice) => {
  try {
    // Si la DIAN devolvió HTML (p. ej., error 500), detectarlo antes de parsear XML
    if (typeof xmlResponse === 'string') {
      const trimmed = xmlResponse.trim().toLowerCase();
      const looksHtml =
        trimmed.startsWith('<!doctype html') ||
        trimmed.startsWith('<html') ||
        trimmed.includes('<title>') ||
        trimmed.includes('internal server error');

      if (looksHtml) {
        // Extraer pista del título si está disponible
        const titleMatch = xmlResponse.match(/<title[^>]*>([^<]+)<\/title>/i);
        const titleText = titleMatch
          ? titleMatch[1].trim()
          : 'Error HTTP en DIAN';

        return {
          isValid: false,
          msg: titleText,
          statusCode: '500',
          errorList: ['DIAN devolvió HTML en lugar de SOAP XML'],
        };
      }
    }

    const rta = await parseXml(xmlResponse);

    // Localizar body con tolerancia a namespaces
    const body =
      rta.body ||
      rta.Body ||
      rta['s:Body'] ||
      (rta['s:Envelope'] && rta['s:Envelope']['s:Body']
        ? rta['s:Envelope']['s:Body']
        : undefined);

    if (!rta || !body) {
      return {
        isValid: false,
        msg: 'Estructura XML no válida: falta Body',
        statusCode: 'STRUCTURE_ERROR',
        errorList: [
          'La respuesta XML no tiene la estructura esperada (falta Body)',
        ],
      };
    }

    // Encontrar el nodo de respuesta y resultado sin depender del prefijo
    const responseKey = webservice + 'Response';
    const responseNode = pickBySuffix(body, responseKey) || body[responseKey];

    if (!responseNode || typeof responseNode !== 'object') {
      return {
        isValid: false,
        msg: `No se encontró ${responseKey} en Body`,
        statusCode: 'MISSING_RESPONSE',
        errorList: [
          `Claves disponibles en Body: ${Object.keys(body).join(', ')}`,
        ],
      };
    }

    const resultKey = webservice + 'Result';
    const result =
      pickBySuffix(responseNode, resultKey) || responseNode[resultKey];

    if (!result || typeof result !== 'object') {
      return {
        isValid: false,
        msg: `No se encontró ${resultKey} en ${responseKey}`,
        statusCode: 'MISSING_RESULT',
        errorList: [
          `Claves disponibles en ${responseKey}: ${Object.keys(
            responseNode
          ).join(', ')}`,
        ],
      };
    }

    if (webservice === 'SendBillSync') {
      const isValid = toBoolean(
        pickBySuffix(result, 'IsValid') || result.IsValid
      );

      const statusCode =
        pickBySuffix(result, 'StatusCode') || result.StatusCode || '';

      const description =
        pickBySuffix(result, 'StatusDescription') ||
        result.StatusDescription ||
        '';

      const dianResponse =
        pickBySuffix(result, 'DianResponse') || result.DianResponse || {};
      const errorList = normalizeErrors(
        pickBySuffix(dianResponse, 'ErrorMessage') || dianResponse.ErrorMessage
      );

      const xmlBase64 =
        pickBySuffix(dianResponse, 'XmlBase64Bytes') ||
        dianResponse.XmlBase64 ||
        '';

      // Fecha/Hora del header (tolerante a namespaces)
      const header =
        rta['s:Envelope']?.['s:Header'] || rta['Envelope']?.['Header'] || {};

      const ts =
        pickBySuffix(header, 'Timestamp') || header['u:Timestamp'] || {};

      const created = pickBySuffix(ts, 'Created') || ts['u:Created'] || '';

      const fechaAPP = await fechaAttached(created || new Date().toISOString());

      const fechaAppRes = fechaAPP.fechaFormateada;

      const tiempoAppRes = fechaAPP.tiempoFormateado;

      return {
        isValid,
        msg: description || '',
        statusCode: String(statusCode || ''),
        errorList,
        xmlBase64: String(xmlBase64 || ''),
        fechaAppRes,
        tiempoAppRes,
      };
    } else if (webservice === 'SendTestSetAsync') {
      const zipKey =
        pickBySuffix(result, 'ZipKey') ||
        result.ZipKey ||
        result['b:ZipKey'] ||
        '';
      return {
        msg: 'Solicitud de habilitación enviada a DIAN',
        zipKey: String(zipKey || ''),
        apikey: String(zipKey || ''),
      };
    }

    // Webservice desconocido
    return {
      isValid: false,
      msg: `Webservice no soportado: ${webservice}`,
      statusCode: 'UNSUPPORTED_SERVICE',
      errorList: [],
    };
  } catch (error) {
    // Falla general de parseo o estructura
    return {
      isValid: false,
      msg: 'Error procesando respuesta de DIAN',
      statusCode: 'PROCESSING_ERROR',
      errorList: [error.message],
    };
  }
};

module.exports = { procesaRtaDian };
