
const path = require('path');
const cli = require('./cli.js'); // 编译执行
const utils = require('./utils.js'); // 封装一些方法
const config = require('./config.js'); // cml配置及获取配置的方法
const log = require('./log.js'); // 封装了一些终端文本打印方法
const argv = require('minimist')(process.argv.slice(2)); // 轻量级命令解析引擎
const EventEmitter = require('events'); // EventEmitter的核心就是事件触发与事件监听器功能的封装

const chameleon = {};
global.chameleon = chameleon;
global.cml = chameleon; // 缩写别名
cml.root = path.join(__dirname, '../');
cml.projectRoot = argv.root || process.cwd();
cml.utils = utils; // 全局方法
cml.config = config; // 全局配置
cml.cli = cli; // 全局cli
cml.log = log; // 全局log方法
cml.event = new EventEmitter(); // 全局事件触发及事件监听器
cml.utils.setCli(true); // 标识当前在chameleon-cli环境中
cml.logLevel = argv.log || 'none'; // 日志输入等级   none  debug
cml.log.setLogLevel(cml.logLevel); // 设置日志等级

// 设置projectName为项目根目录文件名称
cml.config.get().projectName = path.basename(cml.projectRoot)

const configPath = path.join(cml.projectRoot, 'chameleon.config.js'); // 配置文件路径
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
