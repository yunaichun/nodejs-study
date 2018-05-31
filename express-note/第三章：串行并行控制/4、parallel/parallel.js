var fs = require('fs');
var path = require('path');
var completedTasks = 0; // 监听完成的并行任务数量
var tasks = []; // 存储并行任务
var wordCounts = {}; // 存储所有单词[所有文件共用此全局变量]
var filesDir = './text';

/**
 * [checkIfComplete 当所有任务完成以后，列出文件中用到的每个单词以及用了多少次]
 * @return {[type]} [description]
 */
function checkIfComplete() {
	completedTasks++;
	if (completedTasks == tasks.length) {
		for (var index in wordCounts) {
			console.log(index + ':' + wordCounts[index]);
		}
	}
}

/**
 * [countWordsText 统计一个文件中的每个单词总量]
 * @param  {[type]} text [传入一个文件中的所有文本内容]
 * @return {[type]}      [description]
 */
function countWordsText(text) {
	var words = text.toString().toLowerCase().replace(/\./g, '').split(/\W+/).sort();
	console.log(words);
	for (var index in words) {
		var word = words[index];
		if (word) {
			wordCounts[word] = wordCounts[word] ? wordCounts[word] + 1 : 1;
		}
	}
}

fs.readdir(filesDir, function(err, files) {
	if (err) {
		throw err;
	}
	for (var index in files) {
		var task = (function(file) {
			return function() {
				fs.readFile(file, function(err, text) {
					if (err) {
						throw err;
					}
					countWordsText(text);
					checkIfComplete();
				});
			}
		})(path.join(__dirname, filesDir, files[index]));
		tasks.push(task);
	}
	for (var task in tasks) {
		tasks[task]();
	}
});