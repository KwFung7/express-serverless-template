const axios = require('axios');
const timeout = parseInt(process.env.HTTP_TIMEOUT);

class HttpRequest {
  // constructor(baseUrl) {
  //   this.baseURL = baseUrl
  // }
  // get axios config
  getInsideConfig() {
    const config = {
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      // cross-domain
      withCredentials: false, // default
      timeout,
    };
    return config;
  }

  // intercept
  interceptors(instance) {
    // request intercept
    instance.interceptors.request.use(
      function (config) {
        console.log(config);
        return config;
      },
      function (error) {
        return Promise.reject(error);
      }
    );

    // response intercept
    instance.interceptors.response.use(
      function (response) {
        if (response.status === 200) {
          return Promise.resolve(response.data);
        } else {
          return Promise.reject(response);
        }
        // return response;
      },
      function (error) {
        // errorHandle(error)
        return Promise.reject(error);
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

  get(url, config = {}) {
    const options = {
      method: 'get',
      url,
      ...config,
    };
    return this.request(options);
  }

  getV2(url, params, config = {}) {
    const options = {
      method: 'get',
      url,
      ...config,
    };
    return this.request(options);
  }

  delete(url, data = {} ,config = {}) {
    const options = {
      method: 'delete',
      url,
      data,
      ...config,
    };
    return this.request(options);
  }

  post(url, data = {}) {
    // console.log(data)
    return this.request({
      method: 'post',
      url: url,
      data: data,
    });
  }

  put(url, data = {}) {
    return this.request({
      method: 'put',
      url: url,
      data: data,
    });
  }
  
}

module.exports = HttpRequest;
