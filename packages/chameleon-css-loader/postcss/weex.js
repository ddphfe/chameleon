const rework = require('rework'); // css预处理框架
const weexCssSupport = require('../transform/weex'); // 针对weex平台的样式转换库

/**
 * 处理css源码
 *
 * @param  {string} source 源码
 * @return {string}        处理后的数据
 */
module.exports = source => {
  let result = rework(source).use(function (ast) {
    ast.rules.forEach(rule => {
      if (!rule.declarations) {
        return;
      }
      let allDeclarations = [];
      rule.declarations.forEach(declaration => {
        delete declaration.position; // 删除无用属性
        // 注释部分不做处理
        if (declaration.type !== 'comment') {
          let declarations = weexCssSupport.convert(declaration); // 每条style进行对weex的样式转换
          allDeclarations = allDeclarations.concat(declarations);
        }
      });
      rule.declarations = allDeclarations;
    });
  })
    .toString();
  return result;
};
