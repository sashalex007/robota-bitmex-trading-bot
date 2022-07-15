
(function() {
    'use strict';
  
    angular
      .module('app.core')
      .factory('socketService', socketService);
  
    

    function socketService() {
        var stack = [];
        var onmessageDefer;
        var socket = {
            ws: new WebSocket('ws://'+ location.host),
            send: function(data) {
                //data = JSON.stringify(data);
                if (socket.ws.readyState == 1) {
                    socket.ws.send(data);
                } else {
                    stack.push(data);
                }
            },
            onmessage: function(callback) {
                if (socket.ws.readyState == 1) {
                    socket.ws.onmessage = callback;
                } else {
                    onmessageDefer = callback;
                }
            }
        };
        socket.ws.onopen = function(event) {
            for (i in stack) {
                socket.ws.send(stack[i]);
            }
            stack = [];
            if (onmessageDefer) {
                socket.ws.onmessage = onmessageDefer;
                onmessageDefer = null;
            }
        };
        return socket;
    }
  
  })();
  