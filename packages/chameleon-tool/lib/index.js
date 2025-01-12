
const path = require('path');
const cli = require('./cli.js');
const utils = require('./utils.js');
const config = require('./config.js');                    //获取chameleon默认配置文件
const log = require('./log.js');
const argv = require('minimist')(process.argv.slice(2));
const EventEmitter = require('events');

//为cml全局变量绑定属性
const chameleon = {};
global.chameleon = chameleon;
global.cml = chameleon;
cml.root = path.join(__dirname, '../');
cml.projectRoot = argv.root || process.cwd(); // process.cwd()表示返回运行当前脚本的工作目录的路径[cwd: current work directory]
cml.utils = utils;
cml.config = config;
cml.cli = cli;
cml.log = log;
cml.event = new EventEmitter();
cml.utils.setCli(true); // 标识当前在chameleon-cli环境中
cml.logLevel = argv.log || 'none'; // 日志输入等级   none  debug
cml.log.setLogLevel(cml.logLevel);

// 设置projectName为项目根目录文件名称
cml.config.get().projectName = path.basename(cml.projectRoot)

//加载用户自定义的配置文件，配置文件通过访问cml这个全局对象来添加配置
const configPath = path.join(cml.projectRoot, 'chameleon.config.js');
if (cml.utils.isFile(configPath)) {
  require(configPath);
  // 标识是否加载了项目中的配置文件。
  cml.config.loaded = true;
} else {
  cml.config.loaded = false;
}
// 设置内置组件库名称
cml.utils.setBuiltinNpmName(cml.config.get().builtinNpmName);
cml.extPlatformPlugin = {}; // 扩展端的插件对象
cml.cli.run(); // 执行cli
