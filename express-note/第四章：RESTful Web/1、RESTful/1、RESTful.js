var http = require('http');
var url = require('url');// 解析请求
var items = [];

var server =http.createServer(function(req, res) {
	// 判断请求方法
	switch (req.method) {
		case 'POST':
			var item = '';
			// 文本格式不需要二进制数据，将流编码设定为utf8或ascii
			req.setEncoding('utf8');
			req.on('data', function(chunk) {
				item += chunk;
			});
			req.on('end', function() {
				items.push(item);
				res.end('OK\n');
			})
			break;
		case 'GET':
			var body = items.map(function(item, i) {
				return i + ':' + item;
			}).join('\n');
			// 设置响应长度：提升相应速度
			res.setHeader('Content-length', Buffer.byteLength(body));// 'a b…'.length = 6, Buffer.byteLength('a b…') = 4
			// 设置响应内容类型
			res.setHeader('Content-type', 'text/plain; charset="utf-8"');
			res.end(body);
			break;
		case 'DELETE':
			var path = url.parse(req.url).pathname;
			var i = parseInt(path.slice(1), 10);
			if (isNaN(i)) {
				// 设置响应状态码
				res.statusCode = 400;
				res.end('Invalid item id');
			} else if (!items[i]) {
				res.statusCode = 400;
				res.end('Item not found');
			} else {
				items.splice(i, 1);
				res.end('OK\n');
			}
			break;
	}
});

server.listen(3000, function() {
	console.log('Server listening on port 3000');
});