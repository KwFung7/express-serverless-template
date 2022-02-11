const path = require('path');

// log
const log4js = require('log4js');
log4js.configure(path.join(__dirname, '../config/log4js.json'));
const logger = log4js.getLogger();

module.exports = logger;