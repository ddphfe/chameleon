
exports.name = 'web';
exports.usage = '[command] [options]';
exports.desc = 'tools for the web project';

/* istanbul ignore next */
exports.register = function (commander) {
  commander
    .option('-r, --root [root]', 'specify project root')
    .option('-n, --nopreview ', "don't auto open preview")
    .action(function (...args) {
      /* eslint-disable */
      cml.log.startBuilding();
      const inquirer = require('inquirer');
      const utils = require('../utils.js');
      /* eslint-disable */
      cml.utils.checkProjectConfig();
      // 不能删除
      var options = args.pop(); // eslint-disable-line
      var cmd = args.shift();
        //如果web后面有参数，则处理构建
      if (cmd) {
        handlerCmd(cmd);
      } else {
          //如果web后面没有参数，则在命令行允许用户进行交互操作
        let questions = [{
          type: 'list',
          name: 'type',
          message: 'Which do you want to do?',
          choices: [
            'dev',
            'build'
          ]
        }]
        inquirer.prompt(questions).then(answers => {
          handlerCmd(answers.type)
        })
      }
        //处理dev或者build命令
      function handlerCmd(cmd) {
        cml.media = cmd;
        utils.startReleaseOne(cmd, 'web');
      }


    })
  commander.on('--help', function() {
    var cmd = `
  Commands:
    dev     develop the project for web
    build   build the project for web
  Examples:
    cml web dev
    cml web build
    `
    console.log(cmd)
  })


}
