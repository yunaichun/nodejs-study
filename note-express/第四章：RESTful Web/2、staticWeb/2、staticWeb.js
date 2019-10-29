var http = require('http');
var url = require('url');// 解析请求
var path = require('path');
var fs = require('fs');

var server =http.createServer(function(req, res) {
	var requestUrl = url.parse(req.url);
	var requestpath = path.join(__dirname, requestUrl.pathname);
	fs.stat(requestpath, function(err, stat) {
		if (err) {
			if (err.code == 'ENOENT') {
				res.statusCode = 404;
				res.end('Not Found');
			} else {
				res.statusCode = 500;
				res.end('Internal Server Error');
			}
		} else {
			// 提升响应速度，设置响应长度
			res.setHeader('Content-Length', stat.size);
			var stream = fs.createReadStream(requestpath);
			// stream.on('data', function(chunk) {
			// 	res.write(chunk);
			// });
			// stream.on('end', function() {
			// 	res.end();
			// });
			// 将可读流的数据发送给响应
			stream.pipe(res);// res.end()会在stream.pipe()中调用
			// 处理服务器错误
			stream.on('error', function(err) {
				res.statusCode = 500;
				res.end('Internal Server Error');
			});
		}
	});

});

server.listen(3000, function() {
	console.log('Server listening on port 3000');
});