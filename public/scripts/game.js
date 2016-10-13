// Aliases
var Container = PIXI.Container,
    autoDetectRenderer = PIXI.autoDetectRenderer,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Rectangle = PIXI.Rectangle,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text;

// use socket.io
var socket = io.connect();

var player = new Sprite();
var boardBackground;
var WIDTH = 500, HEIGHT = 500;
var PLAYER_WIDTH = 50, PLAYER_HEIGHT = 50;
var WALL_HEIGHT = 10, WALL_WIDTH = 10;
var playerSpeed = 5;
var myId = "";
var clientData = {};
var players = {};
var mapWalls = [];
var startPosition = {'x': WIDTH/2 - player.width/2, 'y': HEIGHT/2 - player.height/2};

// create renderer
var renderer = autoDetectRenderer(
    WIDTH, HEIGHT,
    {antialias: false, transparent: false, resolution: 1}
);

// background color of stage
renderer.backgroundColor = 0x061639;

// add the canvas to the HTML document
document.getElementById("game").appendChild(renderer.view);

// create a container object called the 'stage'
var stage = new Container();

// tell the 'renderer' to 'render' the 'stage'
renderer.render(stage);

// load images
loader
    .add("images/blocks.json")
    .load(setup)
    .load(setupMap);

var playerTexture;
var wallTexture;

function setup() {
    playerTexture = TextureCache["cube.png"];
    wallTexture = TextureCache["wall.png"];

    //Capture the keyboard arrow keys
    var left = keyboard(37),
        up = keyboard(38),
        right = keyboard(39),
        down = keyboard(40),
        space = keyboard(32);

    player.texture = playerTexture;
    player.x = startPosition.x;
    player.y = startPosition.y;
    player.vx = 0;
    player.vy = 0;
    stage.addChild(player);

    for (var p in players) {
        newPlayer(p);
    }


    // Up
    up.press = function() {
        player.vy -= 1;
        socket.emit('keyData', {'up': 'down'});
    };
    up.release = function() {
        player.vy += 1;
        socket.emit('keyData', {'up': 'up'});
    };

    // down
    down.press = function() {
        player.vy += 1;
        socket.emit('keyData', {'down': 'down'});
    };
    down.release = function() {
        player.vy -= 1;
        socket.emit('keyData', {'down': 'up'});
    };

    // Left
    left.press = function() {
        if (player.scale.x === -1) {
            player.scale.x = 1;
            player.x -= PLAYER_WIDTH;
        }
        player.vx -= 1;
        socket.emit('keyData', {'left': 'down'});
    };
    left.release = function() {
        player.vx += 1;
        socket.emit('keyData', {'left': 'up'});
    };

    // Right
    right.press = function() {
        if (player.scale.x === 1) {
            player.scale.x = -1;
            player.x += PLAYER_WIDTH;
        }
        player.vx += 1;
        socket.emit('keyData', {'right': 'down'});
    };
    right.release = function() {
        player.vx -= 1;
        socket.emit('keyData', {'right': 'up'});
    };

    // Space
    space.press = function() {
        playerSpeed /= 2;
        playerSpeed /= 2;
        socket.emit('keyData', {'space': 'down'});
    };
    space.release = function() {
        playerSpeed *= 2;
        playerSpeed *= 2;
        socket.emit('keyData', {'space': 'up'});
    };

    renderer.render(stage);
}

// keyboard handling
function keyboard(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = true;
    key.press = undefined;
    key.release = undefined;
    //The `downHandler`
    key.downHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) key.press();
            key.isDown = true;
            key.isUp = false;
        }
        event.preventDefault();
    };

    //The `upHandler`
    key.upHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }
        event.preventDefault();
    };

    //Attach event listeners
    window.addEventListener(
        "keydown", key.downHandler.bind(key), false
    );
    window.addEventListener(
        "keyup", key.upHandler.bind(key), false
    );
    return key;
}

function containPlayer() {
    // check for y
    if (player.y <= WALL_HEIGHT) {
        player.y = WALL_HEIGHT;
    }
    else if (player.y + PLAYER_HEIGHT >= HEIGHT - WALL_HEIGHT) {
        player.y = HEIGHT - PLAYER_HEIGHT - WALL_HEIGHT;
    }

    if (player.scale.x === 1) {
        if (player.x <= WALL_WIDTH) {
            player.x = WALL_WIDTH;
        }
        else if (player.x + PLAYER_WIDTH >= WIDTH - WALL_WIDTH) {
            player.x = WIDTH - PLAYER_WIDTH - WALL_WIDTH;
        }

    }

    if (player.scale.x === -1) {
        // check left side
        if (player.x - PLAYER_WIDTH <= WALL_WIDTH) {
            player.x = PLAYER_WIDTH + WALL_WIDTH;
        }
        // check right side
        else if (player.x >= WIDTH - WALL_WIDTH) {
            player.x = WIDTH - WALL_WIDTH;
        }
    }
}

function newPlayer(client) {
    if (client != myId) {
        console.log("player " + client + " has connected");
        players[client] = new Sprite(playerTexture);
        players[client].x = clientData[client].playerPos.x;
        players[client].y = clientData[client].playerPos.y;

        stage.addChild(players[client]);
    }
}

function setupMap() {
    for (var wallTile in mapWalls) {
        var wall = new Sprite(wallTexture);
        wall.x = mapWalls[wallTile][0];
        wall.y = mapWalls[wallTile][1];
        stage.addChild(wall);
    }
    renderer.render(stage);
}

function collision() {
    var collision = false;
    for (var p in players) {
        if ((player.x + player.vx >= players[p].x ||
             player.x + player.vx + PLAYER_WIDTH >= players[p].x) &&
            (player.x + player.vx <= players[p].x + PLAYER_WIDTH ||
             player.x + player.vx + PLAYER_WIDTH <= players[p].x + PLAYER_WIDTH )) {
                if ((player.y + player.vy >= players[p].y ||
                     player.y + player.vy + PLAYER_HEIGHT >= players[p].y) &&
                    (player.y + player.vy <= players[p].y + PLAYER_HEIGHT ||
                     player.y + player.vy + PLAYER_HEIGHT <= players[p].y + PLAYER_HEIGHT )) {
                collision = true;
            }
        }
    }
    return collision;
}

gameLoop();
function gameLoop() {

    // loop this function at 60 fps
    requestAnimationFrame(gameLoop);
    containPlayer();
    //if(!collision()) {
    player.x += player.vx * playerSpeed;
    player.y += player.vy * playerSpeed;
    //}

    socket.emit('playerData', {'myPos':{'x':player.x, 'y':player.y},
                               'myScale': player.scale,
							   'myRotation': player.rotation});

    for (var p in players) {
        if (p in clientData && p != myId) {
            players[p].x = clientData[p].playerPos.x;
            players[p].y = clientData[p].playerPos.y;
            players[p].scale = clientData[p].playerScale;
            players[p].rotation = clientData[p].playerRotation;
            renderer.render(stage);
        }
    }

    renderer.render(stage);
}

socket.on('clientData', function(data) {
    clientData = data.clientData;

    for (var p in players) {
        if (!(p in clientData)) {
            console.log("player " + p + " has disconnected");
            players[p].visible = false;
            delete players[p];
        }
    }
    for (var c in clientData) {
        if (!(c in players)) {
            newPlayer(c);
        }
    }
});

socket.on('startPosision', function(data) {
    startPosition = data.startPosition;
});

socket.on('updateId', function(data) {
    myId = data.myId;
    console.log("myID: " + myId);
});

socket.on("mapData", function(data) {
    for (var tile = 0; tile < 2500; tile++) {
        var x = tile % 50;
        var y = Math.floor(tile/50);

        if (data.mapData.charAt(tile) == "1") {
            mapWalls.push([x*10,y*10]);
        }
    }

});
