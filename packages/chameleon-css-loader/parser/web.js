
const cpx = require('../postcss/cpx.js');
const postcss = require('postcss');
const px2rem = require('postcss-plugin-px2rem');
const weexPlus = require('../postcss/weex-plus'); // 为web和小程序提供编译weex为标准的特殊样式
module.exports = function(source, options = {}) {
  if (options.rem === true) { // 如果使用的是rem那么使用postcss插件进行样式预处理
    return postcss([px2rem(options.remOptions), weexPlus()]).process(source).css;
  } else {
    options.cpxType = 'scale';
    return postcss([cpx(options), weexPlus()]).process(source).css;
  }
}
