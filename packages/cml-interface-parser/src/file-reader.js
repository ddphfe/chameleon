const fs = require('fs');
const path = require('path');
const cliUtils = require('chameleon-tool-utils');
const partRegExp = /<\s*(script)\s*([^>]*?)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/g;
const paramRegExp = /([^\s\=]+)=?(['"])?([^\s\=\'\"]*)\2/g;

function _retrieveInterfaceContent(filePath = null) {
  let fileContent = '';
  let splitParts = {};
  let include = null;

  try {
    fileContent = fs.readFileSync(filePath, 'utf8'); // 对应文件下的内容转换成utf8格式的内容
  } catch (err) {
    // console.warn("cml-interface-parser:", err.message);
  }
  if (fileContent) {
    splitParts = cliUtils.splitParts({ content: fileContent });  // 将编码后的内容解析出script、style、styles、template、customBlocks对应的内容
  }
  if (splitParts.customBlocks && splitParts.customBlocks.length) {
    splitParts.customBlocks.forEach(part => {
      if (part && (part.type === 'include')) {
        include = part;
      }
    });
  }

  if (include && include.attrs && include.attrs.src) {
    return _retrieveInterfaceContent(path.resolve(path.dirname(filePath), include.attrs.src));
  }
  return fileContent;
}

function getContent(filePath = null) {
  let fileRawContent = ''; let interfaceContent = '';
  fileRawContent = _retrieveInterfaceContent(filePath); //检索interface部分的内容

  fileRawContent.replace(partRegExp, (match, type, rawAttribute, definationContent) => {
    !interfaceContent && rawAttribute.replace(paramRegExp, (attrMatch, attrName, mark, attrValue) => {
      if (attrName === 'cml-type' && attrValue === 'interface') {
        interfaceContent = definationContent; // 解析的是对应cml-type = interface部分的内容
      }
    });
  });
  return interfaceContent;
}

module.exports = {
  getContent
}
