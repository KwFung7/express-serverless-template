const express = require('express');
const { StatusCodes } = require('http-status-codes');

const router = express.Router();

/**
 * @openapi
 * /admin:
 *   get:
 *     description: Admin related endpoint
 *     tags: [admin]
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: success
 */
router.get('/', (req, res) => {
  res.sendStatus(StatusCodes.NOT_IMPLEMENTED);
});

module.exports = router;