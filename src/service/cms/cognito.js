const AWS = require('aws-sdk');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const _ = require('lodash');
const jwkToPem = require('jwk-to-pem');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../../util/logger');
const { AWS_TOKYO_REGION, DEFAULT_USER_ROLE } = require('../../constant');

let userPool = null;

const initUserPool = async () => {
  if (userPool) {
    return userPool;
  }

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: userPoolId,
    ClientId: process.env.COGNITO_CLIENT_ID,
  });
  logger.info(`Successfully initialize AWS cognito user pool ${userPoolId}`);
  return userPool;
};

const verifyJwtToken = async (token) => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  try {
    const { data } = await axios.get(`https://cognito-idp.${AWS_TOKYO_REGION}.amazonaws.com/${userPoolId}/.well-known/jwks.json`, {
      method: 'GET',
      json: true,
    });

    const pems = {};
    const keys = data['keys'];
    _.forEach(keys, (key) => {
      //Convert each key to PEM
      const { kid: keyId, n: modulus, e: exponent, kty: keyType } = key;
      const jwk = { kty: keyType, n: modulus, e: exponent };
      const pem = jwkToPem(jwk);
      pems[keyId] = pem;
    });

    //validate the token
    const decodedJwt = jwt.decode(token, {
      complete: true
    });
    if (!decodedJwt) {
      logger.info('Not a valid JWT token');
      return null;
    }

    const kid = decodedJwt.header.kid;
    const pem = pems[kid];
    if (!pem) {
      logger.info('Invalid token');
      return null;
    }

    const verifyPromise = new Promise((resolve, reject) => {
      jwt.verify(token, pem, { algorithms: ['RS256'] }, (err, payload) => {
        if (err) {
          logger.info('Invalid Token.');
          logger.info(err);
          reject(null);
        } else {
          logger.info('Valid Token.');
          resolve(payload);
        }
      });
    });
    return verifyPromise;

  } catch (error) {
    logger.info(`Error! Unable to download JWKs: ${error}`);
    return null;
  }
};

const listCognitoUsers = async () => {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID, /* required */
    AttributesToGet: [
      'sub',
      'email',
      'custom:role',
    ],
    // Filter: 'STRING_VALUE',
    // Limit: 'NUMBER_VALUE',
    // PaginationToken: 'STRING_VALUE'
  };

  const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({
    region: AWS_TOKYO_REGION
  });

  let allData = [];
  const getAllData = async (params) => {
    const data = await cognitoidentityserviceprovider.listUsers(params).promise();
    const { Users, PaginationToken } = data;
    if (Users.length > 0) {
      allData = [...allData, ...Users];
    }
    if (PaginationToken) {
      params.PaginationToken = PaginationToken;
      return await getAllData(params);
    } else {
      return data;
    }
  };
  await getAllData(params);
  return allData;
};

const cognitoUserSignup = ({
  username,
  password,
  email,
  role = DEFAULT_USER_ROLE,
}) => {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID, /* required */
    Password: password, /* required */
    Username: username, /* required */
    UserAttributes: [
      {
        Name: 'email', /* required */
        Value: email,
      },
      {
        Name: 'custom:role',
        Value: role,
      },
    ],
  };
  return new AWS.CognitoIdentityServiceProvider({
    region: AWS_TOKYO_REGION
  }).signUp(params).promise();
};

const cognitoConfirmSignup = (username, confirmationCode) => {
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID, /* required */
    ConfirmationCode: confirmationCode,
    Username: username, /* required */
  };
  return new AWS.CognitoIdentityServiceProvider({
    region: AWS_TOKYO_REGION
  }).confirmSignUp(params).promise();
};

const adminDeleteUser = (username) => {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID, /* required */
    Username: username /* required */
  };
  return new AWS.CognitoIdentityServiceProvider({
    region: AWS_TOKYO_REGION
  }).adminDeleteUser(params).promise();
};

const getCognitoUser = (username) => {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID, /* required */
    Username: username /* required */
  };
  return new AWS.CognitoIdentityServiceProvider({
    region: AWS_TOKYO_REGION
  }).adminGetUser(params).promise();
};

module.exports = {
  initUserPool,
  verifyJwtToken,
  listCognitoUsers,
  cognitoUserSignup,
  cognitoConfirmSignup,
  adminDeleteUser,
  getCognitoUser,
};