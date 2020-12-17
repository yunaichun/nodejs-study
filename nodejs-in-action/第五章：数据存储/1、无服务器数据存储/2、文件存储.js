var fs = require('fs');
var path = require('path');
// 去掉"node cli_tasks.js" 只留下参数
var args = process.argv.splice(2);
// 取出第一个参数
var command = args.shift();
// 合并剩余的参数
var taskDescription = args.join(' ');
// 根据当前的工作目录解析数据库的相对路径[process.cwd() = __dirname]
var file = path.join(process.cwd(), '/tasks');


switch (command) {
    case 'list':
        listTasks(file);
        break;
    case 'add':
        addTask(file, taskDescription);
        break;
    default:
        console.log('Usage: ' + process.argv[0] + ' list|add [taskDescription]');
}
/**
 * [loadOrInitializeTaskArray 从文本文件中加载JSON编码的数据]
 * @param  {[type]}   file [指定文件]
 * @param  {Function} cb   [回调函数]
 * @return {[type]}        [description]
 */
function loadOrInitializeTaskArray(file, cb) {
    fs.exists(file, function(exists) {
        var tasks = [];
        if (exists) {
            fs.readFile(file, 'utf8', function(err, data) {
                if (err) {
                    throw err;
                }
                var data = data.toString();
                // 将JSON存入数据tasks
                var tasks = JSON.parse(data || '[]');
                // 将JSON带入回调
                cb(tasks);
            });
        } else {
            cb([]);
        }
    });
}

/**
 * [listTasks 列出所有已保存的任务]
 * @param  {[type]} file [指定文件]
 * @return {[type]}      [description]
 */
function listTasks(file) {
    loadOrInitializeTaskArray(file, function(tasks) {
        for (var i in tasks) {
            console.log(tasks[i]);
        }
    });
}

/**
 * [storeTasks 把任务保存在磁盘中]
 * @param  {[type]} file  [指定文件]
 * @param  {[type]} tasks [指定文件待写入的内容]
 * @return {[type]}       [description]
 */
function storeTasks(file, tasks) {
    fs.writeFile(file, JSON.stringify(tasks), 'utf8', function(err) {
        if (err) throw err;
        console.log('Saved.');
    });
}

/**
 * [addTask 添加一项任务]
 * @param {[type]} file            [指定文件]
 * @param {[type]} taskDescription [命令行输入的值]
 */
function addTask(file, taskDescription) {
    loadOrInitializeTaskArray(file, function(tasks) {
    	// 妈的，tasks竟然在另一个函数中定义的
        tasks.push(taskDescription);
        // 此时tasks已经更新了
        storeTasks(file, tasks);
    });
}