const CryptoJS = require('crypto-js');
const logger = require('./logger');
const moment = require('moment');

const setUpdateExpression = (params) => {
  // common update expression
  const keyList = Object.keys({ ...params }) || [];
  let UpdateExpression = 'set ';
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  keyList.forEach((item, index) => {
    if (params[item] || params[item] == '') {
      UpdateExpression += (('#Key' + index) + (' = :Value' + index) + ',');
      ExpressionAttributeNames[('#Key' + index)] = item;
      ExpressionAttributeValues[(':Value' + index)] = params[item];
    }
  });
  UpdateExpression = UpdateExpression.substring(0, UpdateExpression.length - 1);
  return {
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  };
};

const filteScanParams = (params, fuzzyParams) => {
  // common query expression
  const keyList = Object.keys({ ...params }) || [];
  const fuzzyList = Object.keys({ ...fuzzyParams }) || [];
  let FilterExpression = '';
  const ExpressionAttributeValues = {};
  const ExpressionAttributeNames = {};
  let num = 0;
  if (keyList.length) {
    // table sample query
    keyList.forEach((item, index) => {
      if (params[item] || params[item] === 0 || typeof (params[item]) == 'boolean') {
        num++;
        FilterExpression += ('#' + item + (' = :Value' + index) + ' and ');
        ExpressionAttributeNames[('#' + item)] = item; //映射字段名，这种方式可以使用关键字组查询语句
        ExpressionAttributeValues[(':Value' + index)] = params[item];
      }
    });
    FilterExpression = FilterExpression.substring(0, FilterExpression.length - 4);
  }
  if (fuzzyList.length) {
    // table fuzzy query
    FilterExpression += ' and (';
    let count = 0;
    fuzzyList.forEach((item, index) => {
      if (fuzzyParams[item] || fuzzyParams[item] === 0 || typeof (fuzzyParams[item]) == 'boolean') {
        //query by begins_with/contains
        count++;
        FilterExpression += ('contains(' + ('#' + item) + (', :val' + index) + ') and ');
        ExpressionAttributeValues[(':val' + index)] = fuzzyParams[item];
        ExpressionAttributeNames[('#' + item)] = item;
      }
    });
    if (count > 0) {
      FilterExpression = FilterExpression.substring(0, FilterExpression.length - 4);
      FilterExpression += ' ) ';
    } else {
      FilterExpression = FilterExpression.substring(0, FilterExpression.length - 5);
    }

  }
  return num ? {
    FilterExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  } : {};
};

const fuzzyScanParams = (params) => {
  const keyList = Object.keys({ ...params }) || [];
  if (!keyList.length) return {};
  let FilterExpression = '';
  const ExpressionAttributeValues = {};
  const ExpressionAttributeNames = {};

  let num = 0;
  if (keyList.length) {
    keyList.forEach((item, index) => {
      if (params[item] || params[item] === 0) {
        num++;
        if (item == 'District') {
          // batch query
          const list = params[item].split(',') || [];
          FilterExpression += ('#' + item) + ' in (';
          list.forEach((child, key) => {
            if (key + 1 == list.length) {
              FilterExpression += ':ids_' + key + ') and ';
            } else {
              FilterExpression += ':ids_' + key + ',';
            }
            ExpressionAttributeValues[':ids_' + key] = child;
          });
        } else if (item == 'channelId' || typeof (params[item]) == 'boolean') {
          //sample query
          FilterExpression += ('#' + item + (' = :Value' + index) + ' and ');
          ExpressionAttributeValues[(':Value' + index)] = params[item];
        } else {
          //fuzzy query by begins_with/contains
          FilterExpression += ('contains(' + ('#' + item) + (', :Value' + index) + ') or ');
          ExpressionAttributeValues[(':Value' + index)] = params[item];
        }
        ExpressionAttributeNames[('#' + item)] = item;

      }
    });
    FilterExpression = FilterExpression.substring(0, FilterExpression.length - 4);
  }
  return num ? {
    FilterExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  } : {};
};

const setArrayToString = (params, symbol = ';') => {
  let result = '';
  if (params && params instanceof Array) {
    result = params.join(symbol);
  } else {
    result = params || '';
  }
  return result;
};

const setStringToArray = (params, symbol = ';') => {
  let result = [];
  if (params && typeof (params) == 'string') {
    const obj = params.split(symbol);
    result = obj.filter(item => item);
  } else {
    result = params || [];
  }
  return result;
};

const sortByModificationOrCreationTime = (list, type = "des") => {
  let result = [];
  if (type == "des") {
    result = list?.sort((a, b) => new Date((b.modifiedTime || b.createdTime)) < new Date((a.modifiedTime || a.createdTime)) ? -1 : 1);
  } else {
    result = list?.sort((a, b) => new Date((b.modifiedTime || b.createdTime)) > new Date((a.modifiedTime || a.createdTime)) ? -1 : 1);
  }
  return result;
};

const commonSortCMSTableField = (list, sortColumn, sortType, callback) => {
  let result = JSON.parse(JSON.stringify(list));
  const numberList = ['sequence'];//save number field
  if (sortColumn && sortType) {
    // filter sortColumn null field
    const nullList = result.filter(item => !item[sortColumn]);
    result = result.filter(item => item[sortColumn]);
    result = result.sort((a, b) => {
      let value1 = a[sortColumn] || '';
      let value2 = b[sortColumn] || '';
      if (sortColumn.toLowerCase().indexOf('date') > -1 || sortColumn.toLowerCase().indexOf('time') > -1) {
        value1 = new Date(a[sortColumn]);
        value2 = new Date(b[sortColumn]);
      }
      if (numberList.includes(sortColumn)) {
        //
        if (sortType == 'ascend') {
          return parseInt(value1) < parseInt(value2) ? -1 : 1;
        } else if (sortType == 'descend') {
          return parseInt(value1) > parseInt(value2) ? -1 : 1;
        }
      } else {
        if (sortType == 'ascend') {
          return value1 < value2 ? -1 : 1;
        } else if (sortType == 'descend') {
          return value1 > value2 ? -1 : 1;
        }
      }
      return false;
    });

    return [...result, ...nullList];
  } else {
    // default sort by district
    return callback();
  }
};

const getDistance = (latlng1, latlng2) => {
  const lat1 = latlng1.latitude;
  const lng1 = latlng1.longitude;
  const lat2 = latlng2.latitude;
  const lng2 = latlng2.longitude;
  const radLat1 = (lat1 * Math.PI) / 180.0;
  const radLat2 = (lat2 * Math.PI) / 180.0;
  const a = radLat1 - radLat2;
  const b = (lng1 * Math.PI) / 180.0 - (lng2 * Math.PI) / 180.0;
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  s = s * 6378.137; // EARTH_RADIUS;
  s = Math.round(s * 10000) / 10000;
  return s * 1000;
};

const isChineseName = value => {
  if (/[\u2E80-\u2FD5\u3190-\u319f\u3400-\u4DBF\u4E00-\u9FCC\uF900-\uFAAD]+/.test(value)) {
    return true;
  } else {
    return false;
  }
};

const encryptedText = (message, timestamp = '') => {
  const ciphertext = CryptoJS.AES.encrypt(message, `${process.env.CRYPTOJS_KEY}${timestamp}`).toString();
  return ciphertext;
};

const decryptedText = (message = '', timestamp = '') => {
  let status = false;
  let text = '';
  const decryptedFun = function(time = '') {
    if (status) return;
    try {
      const bytes = CryptoJS.AES.decrypt(message, `${process.env.CRYPTOJS_KEY}${time}`);
      // logger.info(`AES Key: ${process.env.CRYPTOJS_KEY}${time}`);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (originalText) {
        status = true;
        text = originalText;
      }
    } catch (err) {
      //
    }

  };
  if (timestamp) {
    const number = process.env.TIME_STAMP_NUM || 30;
    decryptedFun(timestamp);
    if (!status) {
      for (let index = 0; index < number; index++) {
        decryptedFun(moment(timestamp).subtract(index + 1, 'minutes').format('YYYY-MM-DDTHH:mm'));
        decryptedFun(moment(timestamp).subtract(-(index + 1), 'minutes').format('YYYY-MM-DDTHH:mm'));
      }
    }

  } else {
    decryptedFun();
  }
  if (text && status) {
    return text;
  } else {
    logger.info(`System cannot decrypt message: ${message} ${process.env.CRYPTOJS_KEY}${timestamp}`);
    throw '1200';
  }
};

module.exports = {
  setUpdateExpression,
  filteScanParams,
  fuzzyScanParams,
  setArrayToString,
  setStringToArray,
  sortByModificationOrCreationTime,
  getDistance,
  commonSortCMSTableField,
  isChineseName,
  encryptedText,
  decryptedText,
};