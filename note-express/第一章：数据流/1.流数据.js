var http = require('http');
var fs = require('fs');
http.createServer(function(req, res){
	res.writeHeader(200, { 'Content-Type': 'image/jpg' });
	fs.createReadStream('SDT .jpg').pipe(res);
}).listen(3000);
console.log('server start');