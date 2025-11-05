const serverless = require('serverless-http');
const { app } = require('../functions/app');

module.exports = serverless(app);
