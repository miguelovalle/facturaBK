const fs = require('fs');

const xmlPath =
  'C:\\Users\\Usuario\\OneDrive\\Documentos\\Marinos\\FacturaBK\\xmlFiles\\facturas\\fv09004155030002500000294.xml';

try {
  let xml = fs.readFileSync(xmlPath, 'utf8');

  // 1. Eliminar BOM (Byte Order Mark) si existe
  xml = xml.replace(/\r?\n/g, '\\n');

  // 3. Normalizar saltos de línea
  xml = xml.replace(/\r/g, '');
  xml = xml.replace(/\n/g, '\\n');

  // 🚫 no tocar las comillas dobles
  const jsonResult = { xmlContent: xml };

  console.log(JSON.stringify(jsonResult));
} catch (err) {
  console.error('Error leyendo el archivo:', err.message);
}
