

module.exports = function({type, media}) {
  const utils = require('./utils.js');
  cml.media = media;
  cml.log.startBuilding(); // 打印building信息
  utils.startReleaseOne(media, type); // 判断构建平台
}