var OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin')
var webpack = require('webpack');
var getMiniAppCommonConfig = require('./getMiniAppCommonConfig.js');
var merge = require('webpack-merge')
var getMiniAppExportConfig = require("./component_export/getMiniAppExportConfig");

module.exports = function (options) {
  let {type, media} = options;
  //添加cml-loader和webpack的miniapp的target
  var commonConfig = getMiniAppCommonConfig(options);
  var buildConfig = {
    plugins: [
      new webpack.HashedModuleIdsPlugin()
    ]
  }
  const miniMap = {
    wx: {
      cssReg: /(\.wxss|\.css)$/
    },
    alipay: {
      cssReg: /(\.acss|\.css)$/
    },
    baidu: {
      cssReg: /\.css$/
    },
    qq: {
      cssReg: /(\.qss|\.css)$/
    }
  }
  const targetObj = miniMap[type];
  if (options.minimize) {
    buildConfig.plugins = [
        // webpack 插件优化或者压缩CSS资源
      new OptimizeCSSPlugin({
        assetNameRegExp: targetObj.cssReg,
        cssProcessorOptions: { safe: true, discardComments: { removeAll: true }, autoprefixer: false }
      })
    ]
  }
  if (media === 'export') {
    //小程序的export文件的构建
    return getMiniAppExportConfig(merge(commonConfig, buildConfig), options);
  }
  return merge(commonConfig, buildConfig)
}
