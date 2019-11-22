
exports.name = 'build';
exports.usage = '';
exports.desc = 'start build mode';

/* istanbul ignore next */
exports.register = function (commander) {
  commander
    .action(function (...args) {
      //检查配置文件 chameleon.config.js
      cml.utils.checkProjectConfig();

      /* eslint-disable */ 
      cml.log.startBuilding();
      const utils = require('../utils.js');

      /* eslint-disable */
      cml.media = 'build';
      utils.startReleaseAll('build');

    })
  commander.on('--help', function() {
    var cmd = `
      cml build 
    `
    console.log(cmd)
  })

}
