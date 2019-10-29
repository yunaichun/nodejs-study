// 参考文档：https://www.zhihu.com/question/52887227 ---- https://blog.csdn.net/sunq1982/article/details/78032337
var socketio = require('socket.io');
var io;
var currentRoom = {};// 当前所有房间列表    每个用户连接对应一个房间socket.id：{ 'socket.id': room, …… }
var nickNames = {};// 用户昵称对象          每个用户连接对应一个昵称socket.id：{ 'socket.id': name, …… }
var namesUsed = [];// 已经被占用的昵称      [ name, …… ]
var guestNumber = 1;// 连接用户数量

exports.listen = function(server) {
	// 启动Socket.IO服务器，允许它搭载在已有的HTTP服务器之上
	io = socketio.listen(server);
	// io.set('log level', 1);
	// 客户端发送监听事件[自动连接]
	io.sockets.on('connect', function(socket) {
		// 分配昵称：在用户连接上来时赋予其一个访客名
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		// 在用户连接上来时把他放入聊天室Lobby里
		joinRoom(socket, 'Guest Room');
		// 处理用户的消息，更名，以及聊天室的创建和变更
		handleMessageBroadcasting(socket);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		// 客户端发送'rooms'事件：用户发出请求时，向其提供已经被占用的聊天室列表
		socket.on('rooms', function() {
			// 服务端发送'rooms'事件：告诉客户端当前所有房间列表
			socket.emit('rooms', io.sockets.adapter.rooms);
		});

		// 定义用户断开连接后的清除逻辑
		handleClientDisconnection(socket, nickNames, namesUsed);
	})
}

/**
 * [assignGuestName 用户连接上来：为其赋予一个访客名]
 * @param  {[type]} socket      [服务端可以监听'on'，客户端可以触发事件'emit']
 * @param  {[type]} guestNumber [连接用户数量]
 * @param  {[type]} nickNames   [用户昵称对象]
 * @param  {[type]} namesUsed   [已经被占用的昵称]
 * @return {[type]}             [返回当前用户连接的总量]
 */
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	// 用户昵称是在Guest后面加上一个数字，有新用户连接这个数字就会自增
	var name = 'Guest' + guestNumber;
	// 用户昵称存储在nickNames中以便于引用，并且会跟一个内部socketID关联
	nickNames[socket.id] = name;
	// 同时将昵称添加到已经占用的昵称数组中
	namesUsed.push(name);
	// 服务端发送'nameResult'事件：告诉客户端'name'登陆成功了
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	return guestNumber + 1;
}
/**
 * [joinRoom 用户连接上来：进入聊天室逻辑]
 * @param  {[type]} socket [服务端可以监听'on'，客户端可以触发事件'emit']
 * @param  {[type]} room   [用户加入到指定的房间]
 * @return {[type]}        [description]
 */
function joinRoom(socket, room) {
	// 记录用户的当前房间，并且会跟一个内部socketID关联
	currentRoom[socket.id] = room;
	// 调用socket对象的join方法：让用户进入房间
	// socket.join(currentRoom[socket.id]);
	socket.join(currentRoom[socket.id]);
	// 服务端发送'joinResult'事件：让用户知道客户进入了哪个房间
	socket.emit('joinResult', { 
		room: currentRoom[socket.id] 
	});
	// 服务端发送'message'事件：通知其他所有用户当前客户端加入房间
	socket.broadcast.to(currentRoom[socket.id]).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + currentRoom[socket.id] + '.'
	});
	// 确定有哪些用户在这个房间里
	var usersInRoom = io.sockets.adapter.rooms[currentRoom[socket.id]];
	if (usersInRoom) {
		var usersInRoomSummary = 'User currently in ' + room + ': ';
		if (Object.keys(usersInRoom).length > 1) {
			for (var user in usersInRoom['sockets']) {
				if (user != socket.id) { // 其余所有用户信息[因为socket.io为当前用户信息]
					usersInRoomSummary += nickNames[user] + ', ';
				}
			}
			usersInRoomSummary = usersInRoomSummary.substring(0,usersInRoomSummary.length - 2) + '.';
		} else {
			usersInRoomSummary = 'User currently in ' + room + ': just yourself!!!';
		}
		// 服务端发送'message'事件：将此房间所有用户返回给当前连接用户
		socket.emit('message', { 
			text: usersInRoomSummary 
		});
	}
}
/**
 * [handleNameChangeAttempts 用户连接上来：处理用户昵称变更请求]
 * @param  {[type]} socket    [服务端可以监听'on'，客户端可以触发事件'emit']
 * @param  {[type]} nickNames [用户昵称对象]
 * @param  {[type]} namesUsed [已经被占用的昵称]
 * @return {[type]}           [description]
 */
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
	// 客户端发送'nameAttempt'事件：同时将新昵称传至服务端
	socket.on('nameAttempt', function(newName) {
		// 服务端发送'nameResult'事件：昵称不能以Guest开头
		if (newName.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		} else {
			// 如果昵称还没注册上就注册
			if (namesUsed.indexOf(newName) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				nickNames[socket.id] = newName;
				namesUsed.push(newName);
				delete namesUsed[previousNameIndex];
				// 服务端发送'nameResult'事件：将新昵称返回给客户端
				socket.emit('nameResult', {
					success: true,
					name: newName
				});
				// 服务端发送'nameResult'事件：通知其他所有用户当前客户端已修改昵称
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + newName + '.'
				});
			} else {
				// 服务端发送'nameResult'事件：当前昵称已经注册
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				});
			}
 		}
	})
}
/**
 * [handleMessageBroadcasting 用户连接上来：发送聊天消息]
 * @param  {[type]} socket [服务端可以监听'on'，客户端可以触发事件'emit']
 * @return {[type]}        [description]
 */
function handleMessageBroadcasting(socket) {
	// 客户端发送'message'事件：同时将此客户端的room房间 + 此客户端发送的消息text传至服务端
	socket.on('message', function(message) {
		// 服务端发送'message'事件：通知其他所有用户当前客户端发送的消息
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ':' + message.text
		});
	})
}
/**
 * [handleRoomJoining 用户连接上来：创建房间]
 * @param  {[type]} socket [服务端可以监听'on'，客户端可以触发事件'emit']
 * @return {[type]}        [description]
 */
function handleRoomJoining(socket) {
	// 客户端发送'join'事件：同时将此客户端的room房间传至服务端
	socket.on('join', function(room) {
		// 调用socket对象的leave方法：让用户离开房间
		socket.leave(currentRoom[socket.id]);
		// 用户连接上来：进入聊天室逻辑
		joinRoom(socket, room.newRoom);
	});
}
/**
 * [handleClientDisconnection 用户断开连接：清除服务端保存数据]
 * @param  {[type]} socket    [服务端可以监听'on'，客户端可以触发事件'emit']
 * @param  {[type]} nickNames [用户昵称对象]
 * @param  {[type]} namesUsed [已经被占用的昵称]
 * @return {[type]}           [description]
 */
function handleClientDisconnection(socket, nickNames, namesUsed) {
	// 客户端发送'disconnect'事件：清除服务端保存数据
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
};