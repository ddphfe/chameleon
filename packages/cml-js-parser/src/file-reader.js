const fs = require('fs');
const cliUtils = require('chameleon-tool-utils');

function getContent(filePath = null) {
  let fileRawContent = ''; let parts = {}; let scriptContent = '';
  try {
    filePath && (fileRawContent = fs.readFileSync(filePath, 'utf8')); // 对应文件下的内容转换成utf8格式的内容
  } catch (err) {
    // console.warn("cml-interface-parser:", err.message);
  }

  parts = cliUtils.splitParts({content: fileRawContent}); // 将编码后的内容解析出script、style、styles、template、customBlocks对应的内容

  // 从以上解析的内容中找到script的部分，排除类似于cml-type=json这种具有特殊属性的内容
  if (parts.script && parts.script.length) {
    scriptContent = parts.script.filter((item) => Object.keys(item.attrs).length === 0).map((item) => {
      return item.content;
    });
  }

  return scriptContent[0] || '';
}

module.exports = {
  getContent
}
