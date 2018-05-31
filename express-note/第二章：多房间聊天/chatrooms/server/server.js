var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
// 处理基于Socket.IO的服务端聊天功能
var chatServer = require('./lib/chat_server.js');
var cache = {};

//404页面处理
function send404(res) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
	res.write('Error 404: resource not found.');
	res.end();
}
//发送文件数据
function sendFile(res, filePath, fileContents) {
	res.writeHead(200, {'Content-Type': mime.getType(path.basename(filePath))}); 
	res.end(fileContents);
}
//只有第一次访问时才会从文件系统中读取读取，其后都是从缓存中读取
function serverStatic(res, cache, absPath) {
	// 检查文件是否缓存在内存中，在的话就从内存中返回文件
	if (cache[absPath]) {  
		sendFile(res, absPath, cache[absPath]) 
	} else { 
		console.log(absPath);
		// 检查文件是否存在
		fs.exists(absPath, function(exists) {
			if (exists) {
				// 从硬盘中读取文件
				fs.readFile(absPath, function(err, data) {
					if (err) {
						send404(res);
					} else {
						cache[absPath] = data;
						sendFile(res, absPath, data);
					}
				})
			} else {
				send404(res);
			}
		})
	}
}

var server = http.createServer(function(req, res) {
	var filePath;
	if (req.url == '/') {
		filePath = 'client/index.html';
	} else {
		filePath = 'client' + req.url;
	} 
	var absPath = path.join(__dirname, '../', filePath);
	serverStatic(res, cache, absPath);
})

//启动Socket.IO服务器，给它提供一个已经定义好的HTTP服务器，这样它就能够跟HTTP服务器共享同一个TCP/IP端口
chatServer.listen(server);

server.listen(3000, function() {
	console.log('Server listening on port 3000');
});