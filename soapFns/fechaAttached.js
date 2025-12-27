const { DateTime } = require('luxon');

const fechaAttached = async (fecha) => {
  const dt = DateTime.fromISO(fecha, { zone: 'utc' });
  const fechaFormateada = dt.toISODate();
  const tiempoFormateado = dt.toFormat('HH:mm:ss -V');
  return { fechaFormateada, tiempoFormateado };
};

module.exports = { fechaAttached };
