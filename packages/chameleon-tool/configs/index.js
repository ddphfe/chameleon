
const getWebDevConfig = require('./getWebDevConfig.js');
const getWebBuildConfig = require('./getWebBuildConfig.js');
const getWeexDevConfig = require('./getWeexDevConfig.js');
const getWeexBuildConfig = require('./getWeexBuildConfig.js');
const getMiniAppDevConfig = require('./getMiniAppDevConfig.js');
const getMiniAppBuildConfig = require('./getMiniAppBuildConfig.js');
const getExtendConfig = require('./mvvm/getExtendConfig.js');
const utils = require('./utils');

/**
 *
 * @param {*} options
 * type wx  weex  web
 * media dev build
 * root 项目的根目录
 *
 */
module.exports = async function (options) {
  // 获取free端口
  await utils.setFreePort();
  let {type, media} = options;
  let webpackConfig;
  if (cml.config.get().extPlatform && ~Object.keys(cml.config.get().extPlatform).indexOf(type)) {
    //扩展新的插件
    webpackConfig = getExtendConfig(options);
  } else {
    switch (type) {
      case 'wx':
      case "qq":
      case 'alipay':
      case 'baidu':
        if (media == 'dev') {
          webpackConfig = getMiniAppDevConfig(options);
        } else {
          //小程序构建相关
          webpackConfig = getMiniAppBuildConfig(options);
        }
        break;
      case 'web':
        if (media == 'dev') {
          webpackConfig = getWebDevConfig(options);
        } else {
            //web构建相关
          webpackConfig = getWebBuildConfig(options);
        }
        break;
      case 'weex':
        if (media == 'dev') {
          webpackConfig = getWeexDevConfig(options);
        } else {
          //weex构建相关
          webpackConfig = getWeexBuildConfig(options);
        }
        break;
      default:
        break;
    }
  }

  cml.utils.applyPlugin('webpackConfig', { type, media, webpackConfig }, function(params) {
    if (type === params.type && media === params.media) {
      webpackConfig = params.webpackConfig
    }
  })
  return webpackConfig;

}
