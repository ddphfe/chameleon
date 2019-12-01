
const loaderUtils = require('loader-utils')
const mvvmInterfaceParser = require('mvvm-interface-parser');
module.exports = function (source) {
  //获取loader的option
  const rawOptions = loaderUtils.getOptions(this);
  const options = rawOptions || {};
  // loader的类型  wx  web weex
  let {cmlType, media, check = {}} = options;
  //rules匹配到的文件路径
  const filePath = this.resourcePath;
  // todo
  let {result, devDeps} = mvvmInterfaceParser({cmlType, media, source, filePath, check});
  devDeps.forEach(item => {
    //loader-api 添加文件依赖,监听文件的变化
    this.addDependency(item);
  })
  return result;
}
