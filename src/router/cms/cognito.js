const express = require('express');
const _ = require('lodash');
const { StatusCodes } = require('http-status-codes');
const logger = require('../../util/logger');
const { verifyJwtToken, listCognitoUsers, cognitoUserSignup, cognitoConfirmSignup, adminDeleteUser, getCognitoUser } = require('../../service/cms/cognito');
const { DEFAULT_USER_ROLE } = require('../../constant');
const { commonSortCMSTableField } = require('../../util/common');
const router = express.Router();

/**
 * @openapi
 * /cms/cognito/verifytoken:
 *   post:
 *     summary: Verify Cognito JWT token
 *     description: Verify access token with Cognito IDP JSON and jsonwebtoken library
 *     tags: [cognito]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 default: xxxxxxx
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: SUCCESS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'SUCCESS'
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.post('/verifytoken', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyJwtToken(token);

    res.status(StatusCodes.OK).json({
      message: 'SUCCESS',
      success: !_.isEmpty(result),
    });
  } catch (err) {
    const msg = `System call [verifyJwtToken] was failed: ${err}`;
    logger.info(msg);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'System call [verifyJwtToken] was failed.',
      success: false,
      data: null
    });
  }
});


/**
 * @openapi
 * /cms/cognito/users:
 *   get:
 *     summary: Cognito List Users API
 *     description: List all Cognito users in specific user pool
 *     tags: [cognito]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: current
 *         schema:
 *           type: integer
 *         required: true
 *         description: default to current 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         required: true
 *         description: default to pageSize 10
 *       - in: query
 *         name: sortColumn
 *         schema:
 *           type: string
 *         required: false
 *         description: Sort column field name
 *       - in: query
 *         name: sortType
 *         schema:
 *           type: string
 *         required: false
 *         description: ascend / descend
 *     responses:
 *       200:
 *         description: SUCCESS
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/cognitoListUserResponse'
 */
router.get('/users', async (req, res) => {
  try {
    const { current = 1, pageSize = 10, sortColumn, sortType, username, role } = req.query;
    const pageNum = parseInt(current);
    const size = parseInt(pageSize);
    let users = await listCognitoUsers();
    const total = users.length;
    const offset = (pageNum - 1) * size;
    users = users.slice(offset, offset + size).map((user) => {
      const { Username, Attributes = [], UserCreateDate, UserLastModifiedDate, Enabled, UserStatus } = user;
      const attributesMap = {};
      _.forEach(Attributes, (attribute) => {
        const name = attribute['Name'];
        const key = _.camelCase(name.includes(':') ? name.split(':')[1] : name);
        attributesMap[key] = attribute['Value'];
      });
      return {
        username: Username,
        userCreateDate: UserCreateDate,
        userLastModifiedDate: UserLastModifiedDate,
        enabled: Enabled,
        userStatus: UserStatus,
        ...attributesMap,
      };
    });
    users = commonSortCMSTableField(users, sortColumn, sortType, () => {
      // default sort by username
      return users?.sort((a, b) => b.username > a.username ? -1 : 1);
    });
    users = users.filter(item => {
      return (username ? item.username.indexOf(username) > -1 : true) && (role ? role == item.role : true);
    });
    const payload = {
      list: users,
      current: pageNum,
      pageSize: size,
      total
    };

    logger.info(`Successfully retrieved Cognito users!`);
    res.status(StatusCodes.OK).json({
      message: 'SUCCESS',
      success: true,
      data: payload
    });
  } catch (err) {
    const msg = `System call [listCognitoUsers] was failed: ${err}`;
    logger.info(msg);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'System call [listCognitoUsers] was failed.',
      success: false,
      data: null
    });
  }
});


/**
 * @openapi
 * /cms/cognito/user:
 *   post:
 *     summary: Cognito User signup API
 *     description: Signup new Cognito user in specific user pool
 *     tags: [cognito]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/cognitoUserSignupRequest'
 *     responses:
 *       200:
 *         description: SUCCESS
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/cognitoUserSignupResponse'
 */
router.post('/user', async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      role = DEFAULT_USER_ROLE,
    } = req.body;
    const { UserConfirmed, CodeDeliveryDetails = {}, UserSub } = await cognitoUserSignup({
      username,
      password,
      email,
      role,
    });
    const { Destination, DeliveryMedium, AttributeName } = CodeDeliveryDetails;
    logger.info(`Successfully signup cognito user ${username}! Confirmed: ${UserConfirmed}, Delivery Destination: ${Destination}, Sub: ${UserSub}`);

    res.status(StatusCodes.OK).json({
      message: 'SUCCESS',
      success: true,
      data: {
        userConfirmed: UserConfirmed,
        codeDeliveryDetails: {
          destination: Destination,
          deliveryMedium: DeliveryMedium,
          attributeName: AttributeName,
        },
        sub: UserSub,
      }
    });
  } catch (err) {
    const msg = `System call [cognitoUserSignup] was failed: ${err}`;
    logger.info(msg);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'System call [cognitoUserSignup] was failed.',
      success: false,
      data: null
    });
  }
});


/**
 * @openapi
 * /cms/cognito/confirmsignup:
 *   post:
 *     summary: Cognito Confirm Signup API
 *     description: User must verify their email with confirmation code before login to CMS
 *     tags: [cognito]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/cognitoConfirmSignupRequest'
 *     responses:
 *       200:
 *         description: SUCCESS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'SUCCESS'
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.post('/confirmsignup', async (req, res) => {
  try {
    const {
      username,
      confirmationCode,
    } = req.body;
    await cognitoConfirmSignup(username, confirmationCode);
    logger.info(`Successfully confirm signup for cognito user ${username}!`);

    res.status(StatusCodes.OK).json({
      message: 'SUCCESS',
      success: true,
    });
  } catch (err) {
    const msg = `System call [cognitoConfirmSignup] was failed: ${err}`;
    logger.info(msg);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'System call [cognitoConfirmSignup] was failed.',
      success: false,
      data: null
    });
  }
});


/**
 * @openapi
 * /cms/cognito/user:
 *   delete:
 *     summary: Cognito Delete User API
 *     description: Delete user in specific user pool with admin access
 *     tags: [cognito]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: Cognito Username
 *     responses:
 *       200:
 *         description: SUCCESS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'SUCCESS'
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.delete('/user', async (req, res) => {
  try {
    const {
      username,
    } = req.query;
    await adminDeleteUser(username);
    logger.info(`Deleted cognito user ${username}!`);

    res.status(StatusCodes.OK).json({
      message: 'SUCCESS',
      success: true,
    });
  } catch (err) {
    const msg = `System call [adminDeleteUser] was failed: ${err}`;
    logger.info(msg);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'System call [adminDeleteUser] was failed.',
      success: false,
      data: null
    });
  }
});


/**
 * @openapi
 * /cms/cognito/user:
 *   get:
 *     summary: Cognito Get User API
 *     description: Get specific Cognito user in user pool
 *     tags: [cognito]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: Cognito Username
 *     responses:
 *       200:
 *         description: SUCCESS
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/cognitoGetUserResponse'
 */
router.get('/user', async (req, res) => {
  try {
    const { username } = req.query;
    const user = await getCognitoUser(username);
    const { Username, UserAttributes = [], UserCreateDate, UserLastModifiedDate, Enabled, UserStatus } = user;
    const attributesMap = {};
    _.forEach(UserAttributes, (attribute) => {
      const name = attribute['Name'];
      const key = _.camelCase(name.includes(':') ? name.split(':')[1] : name);
      attributesMap[key] = attribute['Value'];
    });

    logger.info(`Successfully retrieved Cognito user ${Username}!`);
    res.status(StatusCodes.OK).json({
      message: 'SUCCESS',
      success: true,
      data: {
        username: Username,
        userCreateDate: UserCreateDate,
        userLastModifiedDate: UserLastModifiedDate,
        enabled: Enabled,
        userStatus: UserStatus,
        ...attributesMap,
      }
    });
  } catch (err) {
    const msg = `System call [getCognitoUser] was failed: ${err}`;
    logger.info(msg);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'System call [getCognitoUser] was failed.',
      success: false,
      data: null
    });
  }
});

module.exports = router;