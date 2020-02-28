const parserConfig = require('./config/babel-parser-config');
const babelParser = require('@babel/parser');
const astTreeParser = require('./src/ast-tree-parser');
const fileReader = require('./src/file-reader');


class InterfaceParser {

  /**
   * Constructor
   * @param {Object} {
   *  filePath, // file that contains javascript context you wanna to parse.
   *  astTree // an ast tree object got from bable parser.
   * }
   */
  constructor({filePath = null, astTree = null}, options = null) {
    this._astTree = null;

    if (filePath) {
      this._astTree = this.getAstTreeFromFile(filePath); // 从文件中解析出AST树
    }
    if (astTree) {
      this._astTree = astTree;
    }
    if (options) {
      this._options = options;
    }
  }

  getAstTreeFromFile(filePath) {
    let content = fileReader.getContent(filePath); // 获取.interface文件夹下cml-type = interface部分的内容
    let astTree = null;
    try {
      astTree = babelParser.parse(content, this._options || parserConfig); // 根据配置的parserConfig属性，利用babel/parser转码解析器来将cml-type = interface的部分解析出AST
    } catch (err) {
      console.error(err);
    }
    return astTree;
  }

  getParseResults() {
    let results = {vars: [], methods: [], props: [], events: []};
    if (this._astTree) {
      results = astTreeParser.parse(this._astTree); // 解析vars, methods, props, events对应内容,并输出
    }
    return results;
  }
}

module.exports = InterfaceParser;
