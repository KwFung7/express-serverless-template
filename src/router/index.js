const express = require('express');
const { StatusCodes } = require('http-status-codes');

const router = express.Router();

router.use('/mobile', require('./mobile'));
router.use('/cms', require('./cms'));

/**
 * @openapi
 * /status:
 *   get:
 *     description: Health check endpoint.
 *     tags: [status]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: success
 */
router.use('/status', (req, res) => {
  res.sendStatus(StatusCodes.OK);
});

module.exports = router;