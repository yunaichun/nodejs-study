var events = require('events');
var util = require('util');
var fs = require('fs');
var path = require('path');

function Watcher(watchDir, distDir) {
	this.watchDir = watchDir;
	this.distDir = distDir;
}
// 等价于Watcher.prototype = new events.EventEmitter();
util.inherits(Watcher, events.EventEmitter);

/**
 * [watch 如果文件有变动，读取此目录下所有子文件，触发文件的'process'事件]
 * @return {[type]} [description]
 */
Watcher.prototype.watch = function() {
	var watcher = this;
	fs.readdir(this.watchDir, function(err, files) {
		if (err) {
			throw err;
		}
		for (var index in files) {
			watcher.emit('process', files[index]);
		}
	});
}
/**
 * [start 程序启动入口：对指定目录下所有文件的监听]
 * @return {[type]} [description]
 */
Watcher.prototype.start = function() {
	var watcher = this;
	// 包括内容、名称、时间戳
	fs.watchFile(this.watchDir, function() {
		watcher.watch();
	});
}


var watchDir = './watch';
var distDir = './dist';
var watcher = new Watcher(watchDir, distDir);
/**
 * [监听文件夹目录下所有改动文件的操作]
 * @param  {[type]}  [传入当前监听文件，即监听目录下的所有文件]
 */
watcher.on('process', function(file) {
	// 监听文件
	var watchFile = path.join(this.watchDir, file);
	// 目标文件
	var distFile = path.join(this.distDir, file.toLowerCase());
	// 修改文件名称
	fs.rename(watchFile, distFile, function(err) {
		if (err) {
			throw err;
		}
	});
});
watcher.start();