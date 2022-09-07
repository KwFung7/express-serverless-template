const express = require('express');
const {StatusCodes} = require("http-status-codes");

const router = express.Router();

// Example
// router.use('/user', require('./crm/user'));

/**
 * @openapi
 * /cms:
 *   get:
 *     description: CMS related endpoint
 *     tags: [cms]
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
