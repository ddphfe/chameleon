module.exports.exportPathVisitor = function(path) {
  let declarationPath = path.get('declaration');
  if (declarationPath.isObjectExpression()) {
    return declarationPath;
  }
  if (declarationPath.isNewExpression()) {
    let className = declarationPath.get('callee').isIdentifier() ? declarationPath.node.callee.name : ''; // 获取类名
    let container = path.container; //解析文件夹下存在的declaration类型
    return className && container.map((eleNode, index) => {
      return path.getSibling(index);
    }).filter((elePath) => {
      return elePath.node.type === 'ClassDeclaration' && elePath.node.id.name === className;
    })[0];
  }
}
