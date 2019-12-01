//封装了node api
const cmlUtils = require('chameleon-tool-utils');
const fs = require('fs');
/**
 * 1 先找到所有interface的定义部分
 * 2 校验是否一致 如果多个路径指向同一interface 则合并依赖
 * @Param interfacePath 文件路径
 * @Param content 文件内容
 */
module.exports = function({interfacePath, content}) {

  let result;
  // 获取interface内依赖的文件
  // 所有interface上的路径都可能影响获取
  let devDeps = [];

  function getInterface(filePath, content) {
    //校验输入参数
    if (filePath !== interfacePath) {
      devDeps.push(filePath);
    }
    if (!content) {
      content = fs.readFileSync(filePath, {encoding: 'utf-8'});
    }
    //解析出文件包含的template,script,style
    let parts = cmlUtils.splitParts({content});
    let include = [];
    //include标签继承多态协议
    for (let i = 0;i < parts.customBlocks.length;i++) {
      if (parts.customBlocks[i].type === 'include') {
        include.push(parts.customBlocks[i]);
      }
    }
    //判断interface定义是否重复
    let interfaceScript = null;
    for (let i = 0;i < parts.script.length;i++) {
      if (parts.script[i].cmlType === 'interface') {
        if (interfaceScript) {
          throw new Error(`multi <script cml-type='interface'></script> has define in : ${filePath}`)
        } else {
          interfaceScript = parts.script[i];
        }
      }
    }

    if (interfaceScript) {
      if (!result) {
        //支持通过src属性引入外部js文件,作为interface声明
        if (interfaceScript.attrs && interfaceScript.attrs.src) {
          let newFilePath = cmlUtils.resolveSync(filePath, interfaceScript.attrs.src);
          if (!cmlUtils.isFile(newFilePath)) {
            throw new Error(`not find file: ${newFilePath}`)
          }
          //添加新的依赖
          devDeps.push(newFilePath);
          let newContent = fs.readFileSync(newFilePath, {encoding: 'utf-8'});
          result = {
            content: newContent,
            contentFilePath: newFilePath
          };
        } else {
          result = {
            content: interfaceScript.content,
            contentFilePath: filePath
          };
        }
      } else {
        //保证interface定义是唯一的
        if (result.contentFilePath !== filePath) {
          throw new Error(`multi <script cml-type='interface'></script> has define in : ${filePath} and ${result.filePath}`)
        }
      }
    }

    include.forEach(item => {
      if (!item.attrs.src) {
        throw new Error(`not define include src attribute in : ${filePath}`)
      }
      let newFilePath = cmlUtils.resolveSync(filePath, item.attrs.src);
      if (!cmlUtils.isFile(newFilePath)) {
        throw new Error(`not find file: ${newFilePath}`)
      }
      // 递归include的文件
      getInterface(newFilePath);
    })

  }

  getInterface(interfacePath, content);

  if (result) {
    return {
      content: result.content,
      devDeps,
      contentFilePath: result.contentFilePath
    };
  } else {
    throw new Error(`not find <script cml-type='interface'></script> in ${interfacePath}`)
  }
}
