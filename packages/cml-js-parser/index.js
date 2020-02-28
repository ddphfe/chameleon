const parserConfig = require('./config/babel-parser-config'); // babel-parse的配置信息
const babelParser = require('@babel/parser'); // 将源代码解析成 AST
const traverse = require('@babel/traverse')['default']; //主要用途是来遍历AST树
const visitors = require('./src/visitors');
const fileReader = require('./src/file-reader');


class CmlJSParser {

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

  // 从文件中解析出AST树中script的部分
  getAstTreeFromFile(filePath) {
    let content = fileReader.getContent(filePath); // 调用chameleon-tool-utils里面的splitParts方法以及分析对应的属性抽离出script的部分
    let astTree = null;
    try {
      astTree = babelParser.parse(content, this._options || parserConfig); // 根据配置的parserConfig属性，利用babel/parser转码解析器来将script的部分解析出AST
    } catch (err) {
      console.error(err);
    }
    return astTree;
  }

  getParseResults() {
    let results = {vars: [], methods: [], props: [], events: []};  // 变量申明
    if (this._astTree) {
      // 遍历_astTree
      traverse(this._astTree, {
        // export default 处理器
        ExportDefaultDeclaration(path) {
          let containerPath = visitors.exportPathVisitor(path);
          if (containerPath) {
            results = visitors.containerPathVisitor(containerPath);
          }
        }
      });
    }
    return results;
  }
}

module.exports = CmlJSParser;
