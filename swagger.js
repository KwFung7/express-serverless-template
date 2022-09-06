const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Awesome Lambda API',
      description: 'API DEV Base Url - https://xxxxxxxxx.execute-api.ap-east-1.amazonaws.com/dev',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'https://xxxxxxxxx.execute-api.ap-east-1.amazonaws.com/dev',
        description: 'Lambda API DEV'
      }
    ],
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
  apis: ['./src/router/**/*.js'], // files containing annotations as above
};

const openapiSpecification = swaggerJsdoc(options);

// Uncomment this to generate swagger output in nodejs setup
// const fs = require('fs');
// const path = './output';
// fs.promises.mkdir(path, {recursive: true});
// fs.writeFileSync(path + '/swagger.json', JSON.stringify(openapiSpecification));

module.exports = openapiSpecification;