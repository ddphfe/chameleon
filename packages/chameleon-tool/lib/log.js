const chalk = require('chalk'); // chalk 包的作用是修改控制台中字符串的样式

const _ = module.exports = {};

let logLevel = 'none';

_.setLogLevel = function(level) { // 日志等级
  logLevel = level;
}

_.debug = function(msg) {
  if (logLevel === 'debug') {
    process.stdout.write('\n' + chalk.gray('[DEBUG]') + ' ' + msg + '\n');
  }
}

_.notice = function(msg) {
  process.stdout.write('\n' + chalk.cyan('[INFO]') + ' ' + msg + '\n');
}

_.warn = function(msg) {
  process.stdout.write('\n' + chalk.yellow('[WARNI]') + ' ' + msg + '\n');
}

_.error = function(msg) {
  process.stdout.write('\n' + chalk.red('[ERROR]') + ' ' + msg + '\n');
}

_.startBuilding = function(cmlType) {
  if (cmlType) {
    _.notice(`${cmlType} Compiling....`)
  } else {
    _.notice('start Compiling...')
  }
}


