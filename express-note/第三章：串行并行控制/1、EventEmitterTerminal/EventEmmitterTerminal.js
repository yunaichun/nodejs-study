var events = require('events');
var net = require('net');
var channel = new events.EventEmitter();
channel.clients = {};
channel.subscriptions = {};

/**
 * [给所有连接的客户端添加'broadcast'监听事件]
 * @param  {[type]} id      [当前连接客户端的ID]
 * @param  {[type]} socket  [socket连接]
 */
channel.on('join', function(id, socket) {
	this.clients[id] = socket;
	// 告知当前用户有多少连接用户
	var welcome = 'Welcome\n' + 'Guest online: ' + this.listeners('broadcast').length;
	this.clients[id].write(welcome);
	this.subscriptions[id] = function(currentId, message) {
		if (id != currentId) {
			this.clients[id].write(message);
		}
	}
	// 一个监听，存储多个回调
	this.on('broadcast', this.subscriptions[id]);
});

/**
 * [给所有连接的客户端添加'leave'监听事件]
 * @param  {[type]}     [当前连接客户端的ID]
 */
channel.on('leave', function(id) {
	// 移除此客户端的'broadcast'监听事件
	this.removeListener('broadcast', this.subscriptions[id]);
	// 向其他所有用户广播此用户离开房间的消息
	this.emit('broadcast', id, id + 'has left the chat.\n');
});

/**
 * [给所有连接的客户端添加'shutdown'监听事件]
 * @param  {[type]}     [当前连接客户端的ID]
 */
channel.on('shutdown', function() {
	// 向所有用户广播服务关闭的消息
	this.emit('broadcast', '', 'Chat has shut down.\n');
	// 移除此客户端的'broadcast'监听事件
	this.removeAllListeners('broadcast');
	
});
var server = net.createServer(function(socket) {
	var id = socket.remoteAddress + ':' + socket.remotePort;//::ffff:127.0.0.1  61080
	// 有新的客户端连接，触发'join'事件[对于所有客户端均会有的初始操作]
	channel.emit('join', id, socket);

	// 有用户发送数据，触发'broadcast'事件
	socket.on('data', function(data) {
		// 方便理解
		var currentId = id;
		data = data.toString();
		// 用户输入'shutdown\r\n'触发服务关闭事件
		if (data == 'q') {
			channel.emit('shutdown');
		}
		//传入当前客户端id + 当前客户端发送消息data
		channel.emit('broadcast', currentId, data);
	});
	
	// 有用户关闭连接，触发'leave'事件
	socket.on('close', function() {
		// 方便理解
		var currentId = id;
		//传入当前客户端id + 当前客户端发送消息data
		channel.emit('leave', currentId);
	});
});
server.listen(3000);
console.log('server start on port 3000');