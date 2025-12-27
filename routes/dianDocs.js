const { Router } = require('express');

const { envioDian } = require('../controlers/dianDocs');
const { reEnvios } = require('../controlers/reEnvios');
const { sendPdfEmail } = require('../controlers/sendPdfEmail');

const router = Router();

router.post('/', envioDian);
router.post('/renvio', reEnvios);
router.post('/send-pdf-email', sendPdfEmail);

module.exports = router;
