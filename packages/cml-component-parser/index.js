const path = require('path');
const fs = require('fs');
const readmeBuilder = require('./src/readme-builder');
const CmlAstTreeParser = require('cml-js-parser');
const InterfaceAstTreeParser = require('cml-interface-parser');
const entranceFlat = require('./src/entrance-flat');



class ComponentParser {
  constructor(filePath = '', options = null) {
    this._paseResults = {props: [], events: []};
    this._options = options;
    filePath && this.resetPath(filePath);
  }

  resetPath(filePath) {
    if (path.extname(filePath) === '.cml') {
      let cmlTreeParser = new CmlAstTreeParser({filePath}, this._options); // 利用cml-js-parser解析出script的部分
      this._paseResults = cmlTreeParser.getParseResults(); // 解析出vars, methods, props, events这四类内容
      this._fileName = path.basename(filePath, '.cml'); // 获取以.cml为后缀的对应文件的文件名
    } else {
      let interfaceTreeParser = new InterfaceAstTreeParser({filePath}, this._options); // 利用cml-interface-parser解析出cml-type=interface的部分
      this._paseResults = interfaceTreeParser.getParseResults(); // 解析出vars, methods, props, events这四类内容
      this._fileName = path.basename(filePath, '.interface'); // 获取以.interface为后缀的对应文件的文件名
    }

    return this;
  }

  getParseResults() {
    return this._paseResults; // 获取解析之后的结果，分为四类：vars, methods, props, events
  }

  isResultsEmpty() {
    return !this._paseResults || (this._paseResults.props.length === 0 && this._paseResults.events.length === 0);
  }

  getJsonContent() {
    return this._paseResults && (JSON.stringify(this._paseResults, null, '\t'));
  }

  getJsonResultsWithComponentName() {
    return {
      name: this._fileName,
      content: this._paseResults
    };
  }

  writeJsonFileToDir(dirPath, fileName = '', content = '') {
    fileName = path.resolve(dirPath, (fileName || this._fileName) + '.json');
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, content || this.getJsonContent(), {
        flag: 'w'
      }, (err) => {
        if (err) {return reject(err);}
        resolve('success');
      });
    });
  }

  getReadmeContent() {
    return !this.isResultsEmpty() ? readmeBuilder.getReadmeFileContent({
      name: this._fileName,
      props: this._paseResults.props,
      events: this._paseResults.events
    }) : '';
  }


  writeReadmeFileToDir(dirPath, fileName = '', content = '') {
    fileName = path.resolve(dirPath, (fileName || this._fileName) + '.md');
    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, content || this.getReadmeContent(), {
        flag: 'w'
      }, (err) => {
        if (err) {return reject(err);}
        resolve('success');
      });
    });
  }

  static flatEntrance(entrance) {
    return entranceFlat.getEntrances(entrance);
  }
}

module.exports = ComponentParser;
