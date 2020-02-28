const CmlJsAstTreeParser = require('cml-js-parser');
const config = require('../../../config');

function getParseResults(astTree) {
  let parser = new CmlJsAstTreeParser({astTree}, config.getParserConfig().script); // 获取到对应的_astTree和_options
  return parser.getParseResults();
}

module.exports = {
  getParseResults
}
