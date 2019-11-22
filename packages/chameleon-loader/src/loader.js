/* eslint-disable */
const path = require('path')
const hash = require('hash-sum') // 哈希生成器
const parse = require('./parser') // 分离文件、获取Type类型的script part、content等等
const createHelpers = require('./helpers')
const loaderUtils = require('loader-utils') //webpack工具类，用于配合loader处理文件
const normalize = require('./utils/normalize')
const componentNormalizerPath = normalize.lib('runtime/component-normalizer')
const fs = require('fs');
const getRunTimeSnippet = require('./cml-compile/runtime/index.js'); //获取运行时代码片段

var compileTemplate = require('chameleon-template-parse'); // cml模板解析

var jsonHandler = require('./cml-compile/json-handle.js'); // cml编译器-针对不同文件类型生成.json文件，并存储json对象
const { getScriptCode } = require('./interface-check/getScriptCode.js');
const cmlUtils = require('chameleon-tool-utils');
const prehandle = require('./utils/prehandle.js');
const loaderMethods = require('./loaderMethods');
const miniAppScript = require('./miniapp-script.js');
const loadIcon = require('./load-icon.js');
let jsonObject = {};

module.exports = function (content) {   // 此处接收到的content是.cml文件的内容
  // 记录cml组件依赖 用于extract-css 优先级排序
  if(!this._compiler._cmlDepsMap) {
    this._compiler._cmlDepsMap = {};
  }
  const componentDeps = [];
  this._compiler._cmlDepsMap[this.resourcePath] = componentDeps; // 全局上注册并初始化cmlDepsMap【css优先级排序】
  const self = this;
  const filePath = this.resourcePath; //.cml文件的入口路径
  
  const rawOptions = loaderUtils.getOptions(this); // 获取当前用户给当前loader传入的参数对象options

  const options = rawOptions || {};


  let defaultCmss =  {
    rem: true,
    scale: 0.5,
    remOptions: {
      // base on 750px standard.
      rootValue: {cpx: 75},
      // to leave 1px alone.
      minPixelValue: null
    },
    autoprefixOptions: {
      browsers: ['> 0.1%', 'ios >= 8', 'not ie < 12']
    }
  }

  //loader的类型  wx  web weex
  const {cmlType, media, builtinNpmName, cmss = defaultCmss, isWrapComponent = true, subProject = []} = options;
  let { isInjectBaseStyle = true } = options;
  //处理拿到json对象, 使用baseStyle来配置是否注入基础样式
  jsonObject = cmlUtils.getJsonFileContent(self.resourcePath, cmlType); // 获取对应文件下，对应confType的配置下的cml-type=json信息；如果是组件的话得到component:true
  
  // 处理子项目的isInjectBaseStyle
  if (subProject.length) {
    subProject.forEach(item => {
      if (self.resourcePath.indexOf(item.npmName) > -1 && item.isInjectBaseStyle !== undefined) {
        isInjectBaseStyle = item.isInjectBaseStyle;
      }
    })
  }

  
  if (jsonObject && jsonObject.baseStyle !== undefined) {
    isInjectBaseStyle = jsonObject.baseStyle;
  }

  
  if(isInjectBaseStyle && cmlType === 'weex') {
    content = prehandle.injectWeexBaseStyle(content, self);
  }

  if(cmlType === 'web') {
    content = prehandle.webAddStyleScope(content, self);
  }


  if(builtinNpmName) {
    cmlUtils.setBuiltinNpmName(builtinNpmName);
  }

  let output = ''
  const isProduction = this.minimize || process.env.NODE_ENV === 'production' // 判断是否为生产环境

  const extName = path.extname(self.resourcePath); // 解析文件类型.cml/.wxml/.swan。。。
  const context = (
    this.rootContext ||
    (this.options && this.options.context) ||
    process.cwd()
  ) // 获取项目所在路径

  //是否是引用的原生小程序组件  wxml文件
  const isWxmlComponent = extName === '.wxml';
  const isAxmlComponent = extName === '.axml';
  const isSwanComponent = extName === '.swan';
  const isMiniAppRawComponent = isWxmlComponent ||  isAxmlComponent || isSwanComponent;
  if(!isMiniAppRawComponent) {
    //处理script cml-type为json的内容
    content = cmlUtils.deleteScript({content, cmlType: 'json'}); // 获取删除 cmlType为json之后的内容
  }
  // 如果是web端 默认添加scoped属性
  // 如果是weex端 默认添加全局样式
  //判断是否是内置组件
  const isBuildInFile = cmlUtils.isBuildIn(filePath, cmlType, context); // 判断是否为cml内置组件
  
  const shortFilePath = path.relative(context, filePath).replace(/^(\.\.[\\\/])+/, '') // 获取相对于项目路径的相对路径
  var hashNum = hash(isProduction ? (shortFilePath + '\n' + content) : shortFilePath) // 通过哈希生成器生成对应文件的hash存储值

  const moduleId = 'data-v-' + hashNum  // 每个cml文件都将对应一个唯一的id，该id可以根据文件路径名和内容hash生成，用于处理css scoped作用域

  const needCssSourceMap = false;

  //需要区分cml的类型 app componet  page 拼接不同的方法
  var entryPath = cmlUtils.getEntryPath(self.resourcePath, context); // 获取文件生成的路径
  // 小程序中有文件夹有@符号无法上传  决定json js wxml文件生成路径
  entryPath = cmlUtils.handleSpecialChar(entryPath);
  let type = 'page';
  if ('app/app.cml' === entryPath) {
    entryPath = 'app.cml';
    type = 'app';
    self.addDependency(path.join(context, './src/router.config.json'));
  } else {
    if (jsonObject.component === true) {
      type = 'component';
    } // 如果文件是在文件夹components下的，jsonObject下会设置component = true
  }

  const parts = parse(content); // 解析删除了cmlType为json之后的content，【即解析 sfc】根据不同的 block 来拆解对应的内容: script、style、styles、template、customBlocks分类
  if(parts.styles.length >1) {
    throw new Error(`${self.resourcePath} statement ${parts.styles.length} style tag,but only allow one`)
  }
  const hasScoped = parts.styles.some(({ scoped }) => scoped) //  如果某个style标签包含scoped属性，则需要进行CSS Scoped处理
  const templateAttrs = parts.template && parts.template.attrs && parts.template.attrs // 判断是否有template的属性
  const hasComment = templateAttrs && templateAttrs.comments
  const hasFunctionalTemplate = templateAttrs && templateAttrs.functional

  // 记录这个组件使用的内置组件，按需引入
  const currentUsedBuildInTagMap = {};

  const {
    getRequire,
    getWxmlRequest
  } = createHelpers(
    self,
    options,
    moduleId,
    parts,
    isProduction,
    hasScoped,
    hasComment,
    hasFunctionalTemplate,
    needCssSourceMap,
    type
  ) // 根据之前解析的相关属性来获取getRequire、getWxmlRequest
  //小程序模板后缀Map
  const miniappTplExt = {
    wx: 'wxml',
    alipay: 'axml',
    baidu: 'swan',
    qq: 'qml'
  }
  //小程序模板后缀正则
  const miniTplExtReg = /(\.wxml|\.axml)$/;
  const miniCmlReg = /(\.cml|\.wx\.cml|\.alipay\.cml|\.qq\.cml|\.baidu\.cml)$/;

  if(isMiniAppRawComponent) {
    miniAppRawComponentHandler.call(this);  //如果是小程序原生组件
  } else {
      //handler中改变output的值 最后返回output
      switch (cmlType) {
        case 'wx':
        case 'qq':
        case 'alipay':
        case 'baidu':
          miniAppHandler.call(this);
          break;
        case 'web':
        case 'weex':
          webWeexHandler.call(this);
          break;
      }
  }



  function ASTcompileTemplate(templateContent, options = {}) {
    let buildInComponents = {};
    // 内置组件库中的cml文件不进行内置组件的替换
    if(!isBuildInFile) {
      buildInComponents = cmlUtils.getBuildinComponents(cmlType, context).compileTagMap;
    }
    let {source, usedBuildInTagMap = {}} = compileTemplate(templateContent, cmlType, {
      buildInComponents,
      cmss,
      ...options
    });
    // currentUsedBuildInTagMap 中 key为  cml-builtin-button
    Object.keys(usedBuildInTagMap).forEach(key =>{
      let value = usedBuildInTagMap[key];
      currentUsedBuildInTagMap[value] = key;
    })
    return source;
  }

  // 引用微信小程序组件处理
  function miniAppRawComponentHandler() {
    
    if((cmlType === 'wx' && extName === '.wxml') || (cmlType === 'alipay' && extName === '.axml') || (cmlType === 'baidu' && extName === '.swan') || (cmlType === 'qq' && extName === '.qml')) {
      //生成json文件
      let jsonFile = filePath.replace(miniTplExtReg,'.json');
      if(!cmlUtils.isFile(jsonFile)) {
        throw new Error(`未找到${filePath}对应的json文件`)
      }
      self.addDependency(jsonFile);
      self.emitFile(entryPath.replace(miniTplExtReg,'.json'), JSON.stringify(jsonObject,'',4));

      //wxml不处理直接生成
      self.emitFile(entryPath, content);
      miniAppScript.addMiniAppScript(self,filePath,context,cmlType)
      var styleString = getWxmlRequest('styles');
      var scriptString = getWxmlRequest('script');
      output += `var __cml__style = ${styleString};\n`
      output += `var __cml__script = ${scriptString};\n`

      //采用分离的方式，入口js会放到static/js下，需要再生成入口js去require该js
      var jsFileName = entryPath.replace(miniTplExtReg, '.js');
      emitJSFile(jsFileName)
    }
  }



  function miniAppHandler() {
    // 记录依赖
    let npmComponents = cmlUtils.getTargetInsertComponents(self.resourcePath, cmlType, context) || [];  // 获取这个组件要插入的组件相关信息
    npmComponents.forEach(item=>{
      componentDeps.push(item.filePath);
    }) // 获取组件的filePath

    let newJsonObj = jsonHandler(self, jsonObject, cmlType, componentDeps) || {}; // 解析文件信息生成新的json信息
    newJsonObj.usingComponents = newJsonObj.usingComponents || {};
    let usingComponents ={} ;

    //为了实现compoents is 将这个模板用到的组件传给模板编译, 但是内置组件不在其中，内置组件需要按需加载
    Object.keys(newJsonObj.usingComponents).forEach(key=>{
      if(!~key.indexOf('cml-buildin-')) {
        usingComponents[key] = newJsonObj.usingComponents[key]
      }
    })

    usingComponents = prepareParseUsingComponents(usingComponents);
    
    //cml 编译出wxml模板
    if (type !== 'app') {
      let parseTemplate = parts.template && parts.template[0];
      let templateContent = (parseTemplate && parseTemplate.content) || '';
      let lang = (parseTemplate && parseTemplate.lang) || 'cml';
      //content是不带template标签的内容；
      let compileResult = ASTcompileTemplate(templateContent, {
        lang,
        usingComponents,
        filePath,
        isInjectBaseStyle
      });  // 得到template的内容

      let emitPath = entryPath.replace(miniCmlReg, `.${miniappTplExt[cmlType]}`)  // 触发的入口
      self.emitFile(emitPath, compileResult);
    }

    // 生成json文件 用于存放解析出来的json内容
    let emitJsonPath = entryPath.replace(miniCmlReg, '.json');

    // 内置组件按需引用
    newJsonObj.usingComponents = newJsonObj.usingComponents || {};
    Object.keys(newJsonObj.usingComponents).forEach(key =>{
      //如果是内置组件 并且没有用过则删除
      if(~key.indexOf('cml-buildin-') && !currentUsedBuildInTagMap[key]) {
        delete newJsonObj.usingComponents[key]
      }
    })

    // 小程序中有文件夹有@符号无法上传
    Object.keys(newJsonObj.usingComponents).forEach(key=>{
      newJsonObj.usingComponents[key] = cmlUtils.handleSpecialChar(newJsonObj.usingComponents[key])
    });
    //处理tabbar中配置的icon路径
    if(type == 'app'){
      loadIcon.handleApptabbar(newJsonObj,filePath,cmlType)
    }
    let jsonResult = JSON.stringify(newJsonObj, '', 4);
    self.emitFile(emitJsonPath, jsonResult);
    
    //cml
    parts.styles.forEach(function (style, i) {
      //微信小程序在使用组件的时候 不支持属性选择器
      style.scoped = false;
      // require style
      var requireString = style.src
        ? getRequireForImport('styles', style, style.scoped)
        : getRequire('styles', style, i, style.scoped)
      output += `var __cml__style${i} = ${requireString};\n`
    })  // getRequireForImport: 针对不同的 type 分别构造一个 import 字符串; getRequire: getRequestString

    var script = parts.script && parts.script[0]; // 获取<script></script>的内容
    if (script) {
      var scriptRequireString = script.src
        ? getRequireForImport('script', script)
        : getRequire('script', script)

      output += `var __cml__script = ${scriptRequireString};\n`


      //采用分离的方式，入口js会放到static/js下，需要再生成入口js去require该js
      var jsFileName = entryPath.replace(miniCmlReg, '.js');
      emitJSFile(jsFileName);
    }
  }


  function emitJSFile(jsFileName) {
    var relativePath;
    if (~self.resourcePath.indexOf('node_modules')) {
      relativePath = path.relative(self.resourcePath, path.join(context, 'node_modules'));
    } else {
      relativePath = path.relative(self.resourcePath, path.join(context, 'src'));  // 相对路径
      if (relativePath == '..' || relativePath == '.') {
        relativePath = ''
      } else {
        relativePath = relativePath.slice(3);
      }
      //app.js需要再去除一个相对路径
      if (jsFileName === 'app.js') {
        relativePath = relativePath.slice(3);
      }
    }
    relativePath = cmlUtils.handleWinPath(relativePath);
    jsFileName = cmlUtils.handleWinPath(jsFileName);
    var entryContent =
    `var __CML__GLOBAL = require('${relativePath}/static/js/manifest.js')\n`;
    if(type === 'app') {
      entryContent += "__CML__GLOBAL.App = App;\n"
    } else if(type === 'component') {
      entryContent += "__CML__GLOBAL.Component = Component;\n"
    } else if(type === 'page') {
      entryContent += "__CML__GLOBAL.Page = Page;\n"
    }
    entryContent += `require('${relativePath}/static/js/common.js')\n`;
    entryContent += `require('${relativePath}/static/js/${jsFileName}')\n`;
    
     
    self.emitFile(jsFileName, entryContent);
  }


  function webWeexHandler() {
    //主要是对模板进行编译和script进行拼接  vue组件的注册
    const parseTemplate = (parts.template && parts.template[0]) || {};
    const templateContent = parseTemplate.content || '';
    const lang = parseTemplate.lang || 'cml';
    const parseScript = (parts.script && parts.script[0]) || {};
    const scriptContent = parseScript.content || '';
    let newTemplate = handleTemplate();
    // if(type === 'app') {
    //   newTemplate = newTemplate.replace(/<app[\s\S]*?\/app>/,`<div class="app" bubble="true">
    //   <router-view ></router-view> 
    // </div>`)
    
    // }
    if(type === 'app') {
      if (cmlType == 'web') {
        newTemplate = newTemplate.replace(/<app[\s\S]*?\/app>/,`<router-view class="app" bubble="true"></router-view> `)
      } else {
        newTemplate = newTemplate.replace(/<app[\s\S]*?\/app>/,`<div class="app" bubble="true">
        <router-view ></router-view> 
        </div>`)
      }
      // newTemplate = `<template><view><router-view></router-view></view></template>`
    }
    let newScript = handleVueScript();
    //拼接

    let newContent = content;
    //---------template----------------script--------
    if(parseTemplate.start < parseScript.start) {
      newContent = content.slice(0,parseTemplate.tagStart) +
        newTemplate +
        content.slice(parseTemplate.tagEnd, parseScript.start) +
        newScript +
        content.slice(parseScript.end);
    } else {
      newContent = content.slice(0,parseScript.start) +
        newScript +
        content.slice(parseScript.end, parseTemplate.tagStart) +
        newTemplate +
        content.slice(parseTemplate.tagEnd);
    }
    output = newContent;


    function handleTemplate() {
      let usingComponents = jsonObject.usingComponents || {};
      usingComponents = prepareParseUsingComponents(usingComponents);
      
      //有组件在weex.cml中的template写的根标签不是唯一的，进入jsx解析会报错
      let before = '';
      if (type === 'component' && isWrapComponent) { // 组件包裹div
        before = '<template>\n<view class="__shadow_root__">' +
        templateContent + '\n' +
        '</view></template>'
      } else { // 其他包裹template
        before = '<template>\n' +
        templateContent + '\n' +
        '</template>'
      }
      return ASTcompileTemplate(before, {
        lang,
        usingComponents,
        filePath,
        isInjectBaseStyle
      });

    }

    function handleVueScript() {
      let { defineComponets, componetsStr } = getComponents();
      let runtimeSnippet = getRunTimeSnippet(cmlType, type);
      let scriptCode = getScriptCode(self, cmlType, scriptContent, media, options.check);
      return `
        ${defineComponets}
        ${scriptCode}
        ${componetsStr}
        ${runtimeSnippet}`
    }

  }


  //获取import组件与components字段
  function getComponents() {
    // 如果是web和weex的app组件形式做特殊处理

    let defineComponets = '';
    let componetsStr = '';
    let coms = jsonObject.usingComponents || {};
    let customComKeys = Object.keys(coms);
    let npmComponents = cmlUtils.getTargetInsertComponents(self.resourcePath, cmlType, context) || [];
    // 内置组件按需加载
    npmComponents = npmComponents.filter(item=>{
      // 如果是内置组件 选择模板中使用了的组件
      if(item.isBuiltin) {
        return !!currentUsedBuildInTagMap[item.name];
        // 如果是其他的npm库组件 选择与用户自定义名称不同的组件
      } else if(!~customComKeys.indexOf(item.name)){
        return true;
      }
    })
    let npmComponentsKeys = npmComponents.map((item) => { return item.name });
    let componentsKey = [];
    componentsKey = [].concat(Object.keys(coms), npmComponentsKeys);
    //组件名称去重
    componentsKey = [...new Set(componentsKey)]

    componetsStr = toUpperCase(`exports.default.components = { ...exports.default.components, ${componentsKey.join(',')} }`)

    //node_modules 中的组件引入
    npmComponents.forEach(item => {
      componentDeps.push(item.filePath);
      defineComponets += `import ${toUpperCase(item.name)} from "${cmlUtils.handleRelativePath(self.resourcePath, item.filePath)}" \n`
    })

    Object.keys(coms).forEach(comKey => {
      let comPath = coms[comKey];
      let { filePath } = cmlUtils.handleComponentUrl(context, self.resourcePath, comPath, cmlType);
      if(filePath) {
        componentDeps.push(filePath);
        defineComponets += `import ${toUpperCase(comKey)} from "${cmlUtils.handleRelativePath(self.resourcePath, filePath)}" \n`
      } else {
        cmlUtils.log.error(`can't find component:${comPath} in ${self.resourcePath} `);
      }
    })
    return {
      defineComponets,
      componetsStr
    }

  }

  function toUpperCase(content) {
    return content.replace(/-(\w)/ig, function (m, s1) {
      return s1.toUpperCase()
    })
  }
  /**
   * 给template parse 提供组件的引用信息
   * 目前不包括内置组件
   * 1 小程序的component is的实现  不能有内置组件  否则无法按需加载
   * 2 判断原生组件不代理事件，
   * 
   * @param {*} originObj key 为组件名称，value为refPath的对象
   * @return {*} [{
   *   tagName: 组件名称
   *   refUrl: 引用路径
   *   filePath: 文件实际路径
   *   isNative： 是否引用的原生组件
   * }]
   */
  function prepareParseUsingComponents(originObj) {
    return loaderMethods.prepareParseUsingComponents({
      loaderContext: self,
      context,
      originObj,
      cmlType
    })
  }
  // done
  return output
}



