const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CDC Lambda',
      version: '1.0.0',
    },
    'x-amazon-apigateway-policy': {
      Version: "2012-10-17",
      Statement: {
        Effect: "Allow",
        Principal: "*",
        Action:
          "execute-api:Invoke",
        Resource: "execute-api:/*"
      },
    },
  },
  apis: ['./src/router/*.js'], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);
const path = './output';

fs.promises.mkdir(path, {recursive: true});
fs.writeFileSync(path + '/swagger.json', JSON.stringify(openapiSpecification));

module.exports = openapiSpecification;