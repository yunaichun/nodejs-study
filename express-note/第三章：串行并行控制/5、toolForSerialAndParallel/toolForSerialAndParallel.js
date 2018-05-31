var fs = require('fs');
var flow = require('nimble');
var exec = require('child_process').exec;

/**
 * [touchNewFile 创建新文件]
 * @param  {[type]} filename [新文件名称]
 * @return {[type]}          [description]
 */
function touchNewFile(filename) {
	exec('touch ' + filename);
	fs.writeFile(filename, filename, function(err) {
	    if(err) {
	        return console.log(err);
	    }
	    console.log(filename + ' has writed content');
	});
}

//按照顺序执行串行化任务
flow.series([
	function(callback) {
		flow.parallel([
			function(callback) {
				console.log('touching file text1.txt…');
				touchNewFile('text1.txt');
				callback();
			},
			function(callback) {
				console.log('touching file text2.txt…');
				touchNewFile('text2.txt');
				callback();
			}
		], callback);// 并行不需要在每个任务中执行callback回调，并行不关注谁先执行
	},
	function(callback) {
		console.log('tar files text1.txt and text2.txt');
		exec('tar -zcvf two.tar text1.txt text2.txt', function(err, stdout, stderr) {
			console.log('All done!');
			callback();// 串行需要执行callback()回调，会将下一个任务拿出执行
		})
	}
]);