var Chat = function(socket) {
	this.socket = socket
}
/**
 * [sendMessage 用户连接上来：处理客户端发送消息]
 * @param  {[type]} room [客户端所在当前房间名称]
 * @param  {[type]} text [客户端当前发送消息]
 * @return {[type]}      [description]
 */
Chat.prototype.sendMessage = function(room, text) {
	var message = {
		room: room,
		text: text
	};
	this.socket.emit('message', message);
}


/**
 * [changeName 用户连接上来：处理客户端更改昵称请求]
 * @param  {[type]} newName [客户端所在当前房间名称]
 * @return {[type]}         [description]
 */
Chat.prototype.changeName = function(newName) {
	this.socket.emit('nameAttempt', newName);
}
/**
 * [changeRoom 用户连接上来：处理客户端更改房间请求]
 * @param  {[type]} newRoom [客户端所在当前房间名称]
 * @return {[type]}         [description]
 */
Chat.prototype.changeRoom = function(newRoom) {
	this.socket.emit('join', {
		newRoom: newRoom
	});
}
/**
 * [processCommand 综合处理聊天逻辑]
 * @param  {[type]} command [输入全部文本]
 * @return {[Boolean]}      [是否是指定文本]
 */
Chat.prototype.processCommand = function(command) {
	var words = command.split(' ');
	var command = words[0].substring(1, words[0].length).toLowerCase(); // 1、/nick [username]  2、/join [room name]
	// 默认false
	var message = false;
	switch (command) {
		case 'join':
			words.shift();
			var newRoom = words.join(' ');
			this.changeRoom(newRoom);
			break;
		case 'nick':
			words.shift();
			var newName = words.join(' ');
			this.changeName(newName);
			break;
		default:
			message = 'Unrecognized command.';
			break;
	}
	return message;
}