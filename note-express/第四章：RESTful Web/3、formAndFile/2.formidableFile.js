var http = require('http');
var formidable = require('formidable');

var server = http.createServer(function(req, res) {
	switch (req.method) {
		case 'GET':
			show(res);
			break;
		case 'POST':
			upload(req, res);
			break;
	}
});
server.listen(3000, function() {
	console.log('Server listening on port 3000');
});

/**
 * [show 显示带有文件上传的表单页面]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
function show(res) {
	var html = [
		'<!DOCTYPE html>',
		'<html lang="en">',
		'<head>',
			'<meta charset="UTF-8">',
			'<title>Todo List</title>',
		'</head>',
		'<body>',
			'<h1>upload file</h1>',
			'<form action="/" method="post" enctypt="multipart/form-data">',
				'<p><input type="text" name="item"></p>',
				'<p><input type="file" name="file"></p>',
				'<p><input type="submit" value="Upload"></p>',
			'</form>',
		'</body>',
		'</html>'
	].join('');
	res.setHeader('Content-type', 'text/html');
	res.setHeader('Content-Length', Buffer.byteLength(html));
	res.end(html);
}
/**
 * [upload 处理上传文件逻辑]
 * @param  {[type]} req [请求]
 * @param  {[type]} res [响应]
 * @return {[type]}     [description]
 */
function upload(req, res) {
	if (!isFormData(req)) {
		res.statusCode = 400;
		res.end('Bad Request: expecting multipart/form-data');
		return;
	}
	var form = new formidable.IncomingForm();
	// form.on('field', function(field, value) {
	// 	console.log(field);//前端name值
	// 	console.log(value);//值
	// });
	// form.on('file', function(name, file) {
	// 	console.log(name);
	// 	console.log(file);// file对象
	// });
	// form.on('end', function() {
	// 	console.log('upload complete!');
	// });
	// form.parse(req);
	form.parse(req, function(err, fields, files) {
		console.log(fields);
		console.log(files);
		console.log('upload complete!');
	});
	form.on('progress', function(bytesReceived, bytesExpected) {
		var percent = Math.floor(bytesReceived/bytesExpected);
		console.log(percent);
	});
}
/**
 * [isFormData 判断请求是否是上传文件]
 * @param  {[type]}  req [请求]
 * @return {Boolean}     [description]
 */
function isFormData(req) {
	console.log(req.headers['content-type'])
	var type = req.headers['content-type'] || '';
	return type.indexOf('multipart/form-data') == 0 || type.indexOf('application/x-www-form-urlencoded') == 0;
	
}