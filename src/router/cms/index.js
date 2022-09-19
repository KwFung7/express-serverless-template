const express = require('express');

const router = express.Router();

router.use('/cognito', require('./cognito'));

module.exports = router;
