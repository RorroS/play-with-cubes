var http = require("http"),
    url = require("url"),
    fs = require("fs"),
    path = require("path");
var rootDir = __dirname + "/public";
var PUBLIC_IP = "192.168.1.36";
var PORT;
var devState = true;

var WIDTH = 800, HEIGHT = 800;
var playerSpeed = 5;
var PLAYER_WIDTH = 50, PLAYER_HEIGHT = 50;

var serverPostSpeed = 1000/60;

var mimeTypes = {
    "html": "text/html",
    "js": "application/javascript",
    "css": "text/css",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "ico": "image/ico"
};

// create the http server
var server = http.createServer(function(request, response) {
    // if root path
    if (request.url == '/'){
        fs.readFile('./public/index.html', function(error, data) {
            // if any type of error occurs when trying to read file
            if(error) {
                // show 404 page
                response.writeHead(200, {'Content-Type': 'text/html'});
                response.write('404 Not Found\n');
                throw(error);
            }
            else {
                // show the index page
                response.writeHead(200, {'content-type': 'text/html'});
                response.write(data, "utf-8");
            }
        });
    }
    else {
        // get the current pathname
        var pathname = url.parse(request.url).pathname;
        var filename = path.join(rootDir, pathname);

        fs.exists(filename, function(exists) {
            if(!exists) {
                fs.readFile('./public/404.html', function(error, data) {
                    if (error) {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write('404 Not Found\n');
                        throw(error);
                    }
                    else {
                        response.writeHead(200, {'Content-Type': 'text/html'});
                        response.write(data);
                    }
                    response.end();
                });
            }
            else {
                // get file extension of file currently being fetched
                var requestedFileExtension = path.extname(filename).split('.')[1];
                // get the mimetype of the file currently being fetched
                var mimeType = mimeTypes[requestedFileExtension] || 'text/plain';

                response.writeHead(200, {'Content-Type': mimeType});
                var fileStream = fs.createReadStream(filename);
                fileStream.pipe(response);
            }
        });
    }
});
runServer(devState);

// a list of all clients currently connected
var clients = {};
var clientData = {};

// use socket.io
var io = require("socket.io").listen(server);

io.sockets.on('connection', function(socket) {
    // an array of all currently connected clients
    clients[socket.id] = socket;

    var player = {};
    var startPosition = {'x': WIDTH/2 - PLAYER_WIDTH/2, 'y': HEIGHT/2 - PLAYER_HEIGHT/2};

    player.x = startPosition.x;
    player.y = startPosition.y;

    player.id = socket.id;
    player.position = startPosition;

    clientData[player.id] = player.position;

    console.log(socket.id + " has connected");

    socket.emit('updateId', {'myId': socket.id});
    socket.emit('startPosision', {'startPosition': startPosition});
    socket.emit('clientData', {'clientData': clientData});

    socket.on('disconnect', function() {
        console.log(socket.id + " has disconnected");
        delete clientData[socket.id];
        delete clients[socket.id];
    });

    socket.on('playerPos', function(data) {
        player.position = data.myPos;
    });

    // runs every 1000/60 milliseconds
    // sends all the clientdata to 
    setInterval(function() {
        if (socket.id in clientData) {
            clientData[socket.id] = player.position;
        }
        socket.emit('clientData', {'clientData': clientData});
    }, serverPostSpeed);

    // get data for pressed keys
    socket.on('keyData', function(key) {
        switch(true) {

        // space down
        case (key.space == 'down'):
            break;
        // space up
        case (key.space == 'up'):
            break;

        // up down
        case (key.up == 'down'):
            break;
        // up up
        case (key.up == 'up'):
            break;

        // down down
        case (key.down == 'down'):
            break;
        // down up
        case (key.down == 'up'):
            break;

        // left down
        case (key.left == 'down'):
            break;
        // left up
        case (key.left == 'up'):
            break;

        // right down
        case (key.right == 'down'):
            break;
        // right up
        case (key.right == 'up'):
            break;
        default:
            break;
        }
    });
});

function runServer(devState) {
    if (devState) {
        PORT = 8000;
        server.listen(PORT);
        console.log("Server running on " + "localhost:" + PORT);
     }
    else {
        PORT = 8001;
        server.listen(PORT, PUBLIC_IP);
        console.log("Server running public on " + PUBLIC_IP + ":" + PORT);
    }
}
