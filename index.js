const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const router = require('./src/router');

const app = express();

app.use(helmet());
app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// generate uuid & set as eventId
app.use((req, res, next) => {
  if ('GET' === req.method) {
    req.query.eventId = uuidv4();
  } else {
    req.body.eventId = uuidv4();
    req.header("Content-Type", "application/json;charset=utf-8");
  }
  next();
});

// x-language
app.use((req, res, next) => {
  if (!req.headers['x-langague']) {
    req.headers['x-langague'] = process.env.DEFAULT_LANGUAGE || 'en';
  }
  next();
});

app.use('/', router);

// const swaggerUi = require('swagger-ui-express');
// const openapiSpecification = require('./swagger');
// app.use('/openapi', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

// Lambda serverless setup
module.exports.handler = serverless(app);

// Standalone NodeJS setup
// const port = process.env.PORT || '3000';
// app.listen(port, () => console.log(`Listening on port ${port}...`));