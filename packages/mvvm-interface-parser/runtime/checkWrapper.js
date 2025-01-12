/**
* 对象包裹器
*运行时的错误信息，根据端传入不同的方法，
* @param  {Object} obj 需要处理的对象
* @return {Object}     对象
*/
/* istanbul ignore next */
module.exports = function (obj, __CML_ERROR__, __enableTypes__, __CHECK__DEFINES__) {
  const className = obj.constructor.name;
  /* eslint-disable no-undef */
  const defines = __CHECK__DEFINES__;
  const enableTypes = __enableTypes__.split(',') || []; // ['Object','Array','Nullable']
  /* eslint-disable no-undef */
  const types = defines.types;
  const interfaceNames = defines.classes[className];
  const methods = {};

  interfaceNames && interfaceNames.forEach(interfaceName => {
    const keys = Object.keys(defines.interfaces);
    keys.forEach(key => {
      Object.assign(methods, defines.interfaces[key]);
    });
  });

  /**
  * 获取类型
  *
  * @param  {*}      value 值
  * @return {string}       类型
  */
  const getType = function (value) {
    if (value instanceof Promise) {
      return "Promise";
    }
    const type = Object.prototype.toString.call(value);
    return type.replace(/\[object\s(.*)\]/g, '$1').replace(/( |^)[a-z]/g, (L) => L.toUpperCase());
  };

  /**
  * 校验类型  两个loader共用代码
  *
  * @param  {*}      value 实际传入的值
  * @param  {string} type  静态分析时候得到的值得类型
  * @param  {array[string]} errList 校验错误信息  类型
  * @return {bool}         校验结果
  */

  /* eslint complexity:[2,39] */
  const checkType = function(value, originType, errList = []) {
    let isNullableReg = /_cml_nullable_lmc_/g;
    let type = originType.replace('_cml_nullable_lmc_', '');
    (type === "Void") && (type = "Undefined")
    let currentType = getType(value);
    let canUseNullable = enableTypes.includes("Nullable");
    let canUseObject = enableTypes.includes("Object");
    if (currentType == 'Null') {
      if (type == "Null") {// 如果定义的参数的值就是 Null，那么校验通过
        errList = [];
      } else {
        // 那么判断是否是可选参数的情况
        (canUseNullable && isNullableReg.test(originType)) ? errList = [] : errList.push(`定义了${type}类型的参数，传入的却是${currentType},请确认是否开启nullable配置`)
      }
      return errList;

    }
    if (currentType == 'Undefined') { // 如果运行时传入的真实值是undefined,那么可能改值在接口处就是被定义为 Undefined类型或者是 ?string 这种可选参数 nullable的情况；
      if (type == "Undefined") {
        errList = [];
      } else {
        (canUseNullable && isNullableReg.test(originType)) ? errList = [] : errList.push(`定义了${type}类型的参数，传入的却是${currentType},请确认是否开启nullable配置或者检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }
    if (currentType == 'String') {
      if (type == 'String') {
        errList = [];
      } else {
        errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }
    if (currentType == 'Boolean') {
      if (type == 'Boolean') {
        errList = [];
      } else {
        errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }
    if (currentType == 'Number') {
      if (type == 'Number') {
        errList = [];
      } else {
        errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }
    if (currentType == 'Object') {
      if (type == 'Object') {
        (!canUseObject) ? errList.push(`不能直接定义类型${type}，需要使用符合类型定义，请确认是否开启了可以直接定义 Object 类型参数；`) : (errList = []);
      } else if (type == 'CMLObject') {
        errList = [];
      } else { // 这种情况的对象就是自定义的对象；
        if (types[type]) {
          const keys = Object.keys(types[type]);
          // todo 这里是同样的问题，可能多传递
          keys.forEach(key => {
            let subError = checkType(value[key], types[type][key], []);
            if (subError && subError.length) {
              errList = errList.concat(subError)
            }
          });
          if (Object.keys(value).length > keys.length) {
            errList.push(`type [${type}] 参数个数与定义不符`)
          }
        } else {
          errList.push('找不到定义的type [' + type + ']!');
        }
      }
      return errList;
    }
    if (currentType == 'Array') {
      if (type == 'Array') {
        (!canUseObject) ? errList.push(`不能直接定义类型${type}，需要使用符合类型定义，请确认是否开启了可以直接定义 Array 类型参数；`) : (errList = []);
      } else {
        if (types[type]) {
          // 数组元素的类型
          let itemType = types[type][0];
          for (let i = 0; i < value.length; i++) {
            let subError = checkType(value[i], itemType, []);
            if (subError && subError.length) {
              errList = errList.concat(subError)
            }
          }
        } else {
          errList.push('找不到定义的type [' + type + ']!');

        }
      }

      return errList;
    }
    if (currentType == 'Function') {
      // if (type == 'Function') {
      //   errList = [];
      // } else {
      //   errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      // }
      if (types[type]) {
        if (!types[type].input && !types[type].output) {
          errList.push(`找不到${types[type]} 函数定义的输入输出`);
        }
      } else {
        errList.push('找不到定义的type [' + type + ']!');
      }
      return errList;
    }
    if (currentType == 'Promise') {
      if (type == 'Promise') {
        errList = [];
      } else {
        errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }
    if (currentType == 'Date') {
      if (type == 'Date') {
        errList = [];
      } else {
        errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }
    if (currentType == 'RegExp') {
      if (type == 'RegExp') {
        errList = [];
      } else {
        errList.push(`定义了${type}类型的参数，传入的却是${currentType},请检查所传参数是否和接口定义的一致`)
      }
      return errList;
    }


    return errList;
  }

  /**
  * 校验参数类型
  *
  * @param  {string} methodName 方法名称
  * @param  {Array}  argNames   参数名称列表
  * @param  {Array}  argValues  参数值列表
  * @return {bool}              校验结果
  */
  /**
       * var __CHECK__DEFINES__ = {
          "types": {
            "Callback": {
              "input": [],
              "output": "Undefined"
            }
          },
          "interfaces": {
            "MultiInterface": {
              "getMsg": {
                "input": ["String", "Object_cml_nullable_lmc_", "Callback_cml_nullable_lmc_"],
                "output": "String"
              }
            }
          },
          "classes": {
            "Method": ["MultiInterface"]
          }
        };
      */
  const checkArgsType = function (methodName, argValues) {
    let argList;
    if (getType(methodName) == 'Array') { // methodName:['getMsg',2];
      // 回调函数的校验    methodName[0] 方法的名字 methodName[1]该回调函数在方法的参数索引
      // 如上，对于可传可不传的回调函数来说，Callback_cml_nullable_lmc_,所以需要将其去掉
      let funcKey = methods[methodName[0]].input[methodName[1]].replace('_cml_nullable_lmc_', '');
      argList = types[funcKey].input;
      // 拿到这个回调函数的参数定义
    } else {
      argList = methods[methodName].input;
    }
    // todo 函数可能多传参数
    argList.forEach((argType, index) => {
      let errList = checkType(argValues[index], argType, []);
      if (errList && errList.length > 0) {
        __CML_ERROR__(`
       校验位置: 方法${methodName}第${index + 1}个参数
       错误信息: ${errList.join('\n')}`)
      }
    });
    if (argValues.length > argList.length) {
      __CML_ERROR__(`[${methodName}]方法参数传递个数与定义不符`);
    }
  };

  /**
  * 校验返回值类型
  *
  * @param  {string} methodName 方法名称
  * @param  {*}      returnData 返回值
  * @return {bool}              校验结果
  */
  const checkReturnType = function (methodName, returnData) {
    let output;
    if (getType(methodName) == 'Array') {
      // 回调函数的校验    methodName[0] 方法的名字 methodName[1]该回调函数在方法的参数索引
      // 如上，对于可传可不传的回调函数来说，Callback_cml_nullable_lmc_,所以需要将其去掉
      let funcKey = methods[methodName[0]].input[methodName[1]].replace('_cml_nullable_lmc_', '');
      output = types[funcKey].output;
      // output = types[methods[methodName[0]].input[methodName[1]]].output;
    } else {
      output = methods[methodName].output;
    }
    // todo output 为什么可以是数组
    // if (output instanceof Array) {
    //   output.forEach(type => {

    //     //todo 而且是要有一个校验不符合就check失败？ 应该是有一个校验通过就可以吧
    //     checkType(returnData, type,[])
    //   });
    // }
    let errList = checkType(returnData, output, []);
    if (errList && errList.length > 0) {
      __CML_ERROR__(`
     校验位置: 方法${methodName}返回值
     错误信息: ${errList.join('\n')}`)
    }
  };

  /**
  * 创建warpper
  *
  * @param  {string}   funcName   方法名称
  * @param  {Function} originFunc 原有方法
  * @return {Function}            包裹后的方法
  */
  const createWarpper = function (funcName, originFunc) {
    return function () {
      const argValues = Array.prototype.slice.call(arguments)
        .map(function (arg, index) {
          // 对传入的方法要做特殊的处理，这个是传入的callback，对callback函数再做包装
          if (getType(arg) == 'Function') {
            return createWarpper([funcName, index], arg);
          }
          return arg;
        });

      checkArgsType(funcName, argValues);


      const result = originFunc.apply(this, argValues);

      checkReturnType(funcName, result)
      return result;
    }
  };

  // 获取所有方法
  const keys = Object.keys(methods);

  // 处理包装方法
  keys.forEach(key => {
    const originFunc = obj[key];
    if (!originFunc) {
      __CML_ERROR__('method [' + key + '] not found!');
      return;
    }

    if (obj.hasOwnProperty(key)) {
      obj[key] =  (key, originFunc);
    } else {
      Object.getPrototypeOf(obj)[key] = createWarpper(key, originFunc);
    }
  });

  return obj;
};
