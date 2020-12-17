var http = require('http');
var qs = require('querystring');// 解析form表单数据
var items = [];

var server = http.createServer(function(req, res) {
	if (req.url == '/') {
		switch (req.method) {
			case 'GET':
				show(res);
				break;
			case 'POST':
				add(req, res);
				break;
			default:
				basRequest(res);
				break;
		}
	} else {
		notFound(res);
	}
});
server.listen(3000, function() {
	console.log('Server listening on port 3000');
});


/**
 * [notFound 未知的请求url地址]
 * @param  {[type]} res [响应]
 * @return {[type]}     [description]
 */
function notFound(res) {
	res.statusCode = 404;
	res.setHeader('Content-Type', 'text/plain');
	res.end('Not Found');
}
/**
 * [basRequest 错误的请求方法]
 * @param  {[type]} res [响应]
 * @return {[type]}     [description]
 */
function basRequest(res) {
	res.statusCode = 404;
	res.setHeader('Content-Type', 'text/plain');
	res.end('Bad Request');
}
/**
 * [add 添加方法]
 * @param {[type]} req [响应]
 * @param {[type]} res [description]
 */
function add(req, res) {
	var body = '';
	req.setEncoding('utf8');
	req.on('data', function(chunk) {
		body += chunk;
	});
	req.on('end', function() {
		var obj = qs.parse(body);
		items.push(obj.item);
		show(res);
	});
}

function show(res) {
	var html = [
		'<!DOCTYPE html>',
		'<html lang="en">',
		'<head>',
			'<meta charset="UTF-8">',
			'<title>Todo List</title>',
		'</head>',
		'<body>',
			'<h1>Todo List</h1>',
			'<ul>',
			items.map(function(item) {
				return '<li>' + item + '</li>'
			}).join(''),
			'</ul>',
			'<form action="/" method="post">',
				'<p><input type="text" name="item"></p>',
				'<p><input type="submit" value="Add Item"></p>',
			'</form>',
		'</body>',
		'</html>'
	].join('');
	res.setHeader('Content-type', 'text/html');
	res.setHeader('Content-Length', Buffer.byteLength(html));
	res.end(html);
}