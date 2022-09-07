const axios = require('axios');
const https = require('https');
const { StatusCodes } = require('http-status-codes');
const logger = require('../logger');

class HttpRequest {

  // get axios config
  getInsideConfig() {
    const config = {
      baseURL: process.env.CRM_BASE_URL,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      // cross-domain
      withCredentials: false, // default
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
    };
    // console.log('axios-baseURL', process.env.CRM_BASE_URL, process.env);
    return config;
  }

  // intercept
  interceptors(instance) {
    // request intercept
    instance.interceptors.request.use(
      function(config) {
        logger.info(`Request: ${JSON.stringify(config)}`);
        return config;
      },
      function(error) {
        return Promise.reject(error);
      }
    );

    // response intercept
    instance.interceptors.response.use(
      function(response) {
        logger.info(`Response: ${JSON.stringify(response.data)}`);
        if (response.status === StatusCodes.OK) {
          return Promise.resolve(response.data);
        } else {
          return Promise.reject(response);
        }
        // return response;
      },
      function (error) {
        const crmMessage = error?.response?.data?.Message;
        return Promise.reject(crmMessage || error);
      }
    );
  }
  // create instance
  request(options) {
    const instance = axios.create();
    const newOptions = Object.assign(this.getInsideConfig(), options);
    this.interceptors(instance);
    return instance(newOptions);
  }

  get(url, config = {}, data = {}) {
    const options = {
      method: 'get',
      url,
      ...config,
      data
    };
    return this.request(options);
  }

  delete(url, data = {}, config = {}) {
    const options = {
      method: 'delete',
      url,
      data,
      ...config,
    };
    return this.request(options);
  }

  post(url, data = {}, config = {}) {
    return this.request({
      method: 'post',
      url: url,
      data: data,
      ...config,
    });
  }

  put(url, data = {}, config = {}) {
    return this.request({
      method: 'put',
      url: url,
      data: data,
      ...config,
    });
  }

}

module.exports = HttpRequest;
