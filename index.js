const express = require('express');
const bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);
const fs = require('fs');

const app = express();
// process.on('uncaughtException', (err) => {
//   console.error('Excepción no capturada:', err.message);
// });
app.use(bodyParser.text({ 
  type: ['text/xml', 'application/xml'], 
  limit: '50mb' 
}));

// Middleware para logging de todas las peticiones
app.use((req, res, next) => {
/*   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body); */
  next();
});

// Configuración del body-parser
app.use(bodyParser.text({ 
  type: ['text/xml', 'application/xml'], 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
// todo lo que exporte  el archivo ./routes/dianDocs lo va a habilitar en la ruta del  endpoint api/dianDocs
app.use('/api/dianDocs', require('./routes/dianDocs'));

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
