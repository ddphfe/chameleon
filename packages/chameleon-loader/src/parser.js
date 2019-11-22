const cmlUtils = require('chameleon-tool-utils');

module.exports = (content) => {
  let parts = cmlUtils.splitParts({content})  // 分离文件
  parts.styles = parts.style;
  return parts;
}

