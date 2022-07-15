var express = require('express');
var http = require('http');
var WebSocket = require('ws')


//import modules
var robota = require('./robota/robotaAsync');


var router = express();
var server = http.createServer(router);
const ws = new WebSocket.Server({ server });

router.use(express.static(__dirname + "/public"));
router.use(express.bodyParser());


//client websocket
ws.on('connection', function connection(ws) {
  console.log('client connected')

  ws.on('error', function error(err) {
    console.log('Error: ' + err.code);
  });

  robota.openClientSocket(ws)
});


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function () {
  console.log("Server listening");
  robota.start();
  //robota.openClientSocket(ws)
});

router.use(function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

process.on('uncaughtException', function (err) {
  //console.log(err);
}); 






