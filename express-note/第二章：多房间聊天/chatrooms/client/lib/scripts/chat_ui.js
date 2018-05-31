/**
 * [divEscapedContentElement 展示可疑的文本内容]
 * @param  {[type]} message [需要展示的文本]
 * @return {[type]}         [description]
 */
function divEscapedContentElement(message) {
	return $('<div></div>').text(message);
}
/**
 * [divSystemContentElement 展示系统创建的受信文本内容]
 * @param  {[type]} message [需要展示的文本]
 * @return {[type]}         [description]
 */
function divSystemContentElement(message) {
	return $('<div></div>').text('<i>' + message + '</i>');
}
/**
 * [processUserInput 处理用户界面输入消息逻辑]
 * @param  {[type]} chatApp [传入chat_client.js封装的chat逻辑]
 * @return {[type]}         [description]
 */
function processUserInput(chatApp, socket) {
	// 用户输入的消息文本
	var message = $('#send-message').val();
	// 特定聊天指定
	if (message.charAt(0) == '/') {
		var systemMessage = chatApp.processCommand(message);
		if (systemMessage) {
			$('#messages').append(divSystemContentElement(systemMessage));
		}
	}
	// 非命令输入广播给其他用户
	else {
		chatApp.sendMessage($('#room').text(), message);//房间 + 消息
		$('#messages').append(divEscapedContentElement(message));// 展示可以文本内容
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	}
	// 重置文本输入框内容
	$('#send-message').val('');
}