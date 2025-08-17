const { Router } = require('express');

const { envioDian } = require('../controlers/dianDocs');
const { attached } = require('../controlers/attached');

const router = Router();

router.post('/', envioDian);
router.post('/attach', attached);

module.exports = router;
