const odbc = require('odbc');

// 🔹 Configura aquí la conexión a Access
const connectionString = 'Driver={Microsoft Access Driver (*.mdb)};Dbq=C:\Users\Usuario\OneDrive\Documentos\Marinos\Prueba.mdb';

// Creamos un pool de conexiones (más eficiente que una única conexión)
const pool = odbc.pool(connectionString);

async function getConnection() {
  return await pool.connect();
}

module.exports = { getConnection };
