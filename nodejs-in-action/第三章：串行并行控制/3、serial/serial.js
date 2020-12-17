var fs = require('fs');
var request = require('request');
var htmlparser = require('htmlparser');
var configFilename = './rss_feeds.txt';

/**
 * [checkForRSSFile 任务一：确保包含RSS预定源URL列表的文件存在]
 * @return {[type]} [description]
 */
function checkForRSSFile() {
	fs.exists(configFilename, function(exists) {
		if (!exists) {
			return next(new Error(configFilename + 'file not exist'));
		}
		next(null, configFilename);
	});
}

/**
 * [readRSSFile 任务二：读取并解析包含预定源URL的文件]
 * @param  {[type]} configFilename [需要读取的文件文件]
 * @return {[type]}                [description]
 */
function readRSSFile(configFilename) {
	fs.readFile(configFilename, function(err, feedList) {
		if (err) {
			return next(err);
		}
		// 开头空白或者结尾空白用回车替代
		feedList = feedList.toString().replace(/^\s+|\s+$/g, '').split('\n');
		var random = Math.floor(Math.random()*feedList.length);
		console.log('请求地址:', feedList[random]);
		next(null, feedList[random])
	});
}

/**
 * [downLoadRSSFeed 任务三：向选定的预定源发送HTTP请求以获取数据]
 * @param  {[type]} feedUrl [需要请求的URL地址]
 * @return {[type]}         [请求的数据]
 */
function downLoadRSSFeed(feedUrl) {
	request({ uri: feedUrl }, function(err, res, body) {
		console.log('响应状态码:', res.statusCode);
		console.log('响应体:', body);
		if (err) {
			return next(err);
		}
		if (res.statusCode != 200) {
			return next(new Error('request failed'));
		}
		next(null, body);
	});
}

/**
 * [parseRSSFeed 任务四：将预定源数据解析到一个条目数组中]
 * @param  {[type]} rss [从预定源请求的内容]
 * @return {[type]}     [description]
 */
function parseRSSFeed(rss) {
	var handler = new htmlparser.RssHandler();
	var parser = new htmlparser.Parser(handler);
	parser.parseComplete(rss);
	if (!handler.dom.length) {
		return next(new Error('No RSS items found'));
	}
	console.log('响应解析内容：', handler.dom);
}


//把所有要做的任务按照执行顺序添加到一个数组中去
var tasks = [
	checkForRSSFile,
	readRSSFile,
	downLoadRSSFeed,
	parseRSSFeed
];
/**
 * [next 任务顺序执行函数执行函数]
 * @param  {[type]}   err    [上一步任务是否有错误]
 * @param  {[type]}   result [上一步任务的结果]
 * @return {Function}        [执行下一步任务]
 */
function next(err, result) {
	if (err) {
		throw err;
	}
	// 从任务数组中取出下一个任务
	var currentTask = tasks.shift();
	if (currentTask) {
		// 执行当前任务
		currentTask(result);
	}
}

//开始任务的串行化执行。第一次result是为空。
next();