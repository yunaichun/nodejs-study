const fs = require('fs')
const walkFile = require('./walk-file')

/**
 * 获取sql目录下的文件目录数据
 * @return {object} 
 */
function getSqlMap () {
  let basePath = __dirname // E:\Learn\NODE\实践\KOA\koa2-note\demo\project\init\util
  basePath = basePath.replace(/\\/g, '\/') // E:/Learn/NODE/实践/KOA/koa2-note/demo/project/init/util
  let pathArr = basePath.split('\/')
  pathArr = pathArr.splice( 0, pathArr.length - 1 ) // 去掉最后一层目录
  basePath = pathArr.join('/') + '/sql/' // 最后一层目录换成sql

  // 传入sql绝对目录路径，文件类型
  let fileList = walkFile( basePath, 'sql' )
  // 返回文件list列表
  return fileList
}

module.exports = getSqlMap