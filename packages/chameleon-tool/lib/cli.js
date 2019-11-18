#! /usr/bin/env node

const commander = require('commander'); // node.js 命令行接口的完整解决方案
const cmlpackage = require('../package.json'); // 引入package.json配置文件
const argv = process.argv; // 通过访问process.argv我们能轻松愉快的接收通过命令执行node程序时候所传入的参数

module.exports.run = function () {

  var first = argv[2]; // argv第一个参数是node
  if (first === '-v' || first === '--version' || first === '-V') { // 查看cml版本
    cml.log.notice(`current running chameleon(${cml.root})`) // 打印chameleon-tool安装目录
    version(); // 打印chameleon-tool版本号
  } else { // 其他命令进入commanders文件下，匹配构建平台
    const extPlatform = require('../commanders/extPlatform.js');
    if (cml.config.get().extPlatform && ~Object.keys(cml.config.get().extPlatform).indexOf(first)) {
      extPlatform({type: first, media: argv[3]});
    } else { // 没有输入构建平台，默认全部构建
      commander.usage('[command] [options]')
      commander.version(`${cmlpackage.name}@${cmlpackage.version}`) // tool版本号
      let cmdList = ['init', 'dev', 'build', 'server', 'web', 'weex', 'wx', 'baidu', 'alipay', 'qq'];
      cmdList = cmdList.map(key => ({ // cmd命令各环境
        key,
        cmd: require(`../commanders/${key}/index.js`) // eslint-disable-line 命令执行文件
      }))

      cmdList.forEach(item => {
        let cmd = item.cmd;
        cmd.register( // 注册命令，执行所有环境
          commander
            .command(cmd.name)
            .option('-l, --log [debug]', 'logLevel')
            .usage(cmd.usage)
            .description(cmd.desc)
        );
      })
      commander.parse(argv); // 解析用户传递过来的参数
    }
  }

  function version() {
    console.log(`${cmlpackage.name}@${cmlpackage.version}`)
  }
}
