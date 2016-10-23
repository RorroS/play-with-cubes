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
var PLAYER_WIDTH = 10, PLAYER_HEIGHT = 10;
var WALL_HEIGHT = 10, WALL_WIDTH = 10;
var myId = "";
var clientData = {};
var players = {};
var mapWalls = [];
var spawnX, spawnY;

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
    .load(setupMap)
    .load(spawnPlayer);

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
        player.speed /= 2;
        player.speed /= 2;
        socket.emit('keyData', {'space': 'down'});
    };
    space.release = function() {
        player.speed *= 2;
        player.speed *= 2;
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

function wallCollision() {
    var collision = "";
    for (var wallTile in mapWalls) {
        var wallX = mapWalls[wallTile][0];
        var wallY = mapWalls[wallTile][1];

        // player incoming from the right side of the wall
        if (player.x >= wallX + WALL_WIDTH &&
            player.x + player.vx <= wallX + WALL_WIDTH) {

            // top of player
            if (player.y >= wallY && player.y <= wallY + WALL_HEIGHT) {
                collision = "LEFT";
            }
            // bottom of player
            else if (player.y + PLAYER_HEIGHT >= wallY &&
                     player.y + PLAYER_HEIGHT <= wallY + WALL_HEIGHT) {
                collision = "LEFT";
            }
        }

        // player incoming from the left side of the wall
        else if (player.x + PLAYER_WIDTH <= wallX &&
                 player.x + PLAYER_WIDTH + player.vx >= wallX) {

            // top of player
            if (player.y >= wallY && player.y <= wallY + WALL_HEIGHT) {
                collision = "RIGHT";
            }

            // bottom of player
            else if (player.y + PLAYER_HEIGHT >= wallY &&
                     player.y + PLAYER_HEIGHT <= wallY + WALL_HEIGHT) {
                collision = "RIGHT";
            }
        }

        // player incoming from the top of the wall
        else if (player.y + PLAYER_HEIGHT <= wallY &&
                 player.y + PLAYER_HEIGHT + player.vy >= wallY) {

            // left side of the player
            if (player.x >= wallX && player.x <= wallX + WALL_WIDTH) {
                collision = "TOP";
            }

            // right side of player
            else if (player.x + PLAYER_WIDTH >= wallX &&
                     player.x + PLAYER_WIDTH <= wallX + WALL_WIDTH) {
                collision = "TOP";
            }
        }

        // player incoming from the bottom of the wall
        else if (player.y >= wallY + WALL_HEIGHT &&
                 player.y + player.vy <= wallY + WALL_HEIGHT) {

            // left side of the player
            if (player.x >= wallX && player.x <= wallX + WALL_WIDTH) {
                collision = "BOTTOM";
            }

            // right side of player
            else if (player.x + PLAYER_WIDTH >= wallX &&
                     player.x + PLAYER_WIDTH <= wallX + WALL_WIDTH) {
                collision = "BOTTOM";
            }
        }
    }
    return collision;
}

function spawnPlayer() {
    player.texture = playerTexture;
    player.x = spawnX;
    player.y = spawnY;
    player.vx = 0;
    player.vy = 0;
    player.speed = 2;
    stage.addChild(player);
}

gameLoop();
function gameLoop() {

    // loop this function at 60 fps
    requestAnimationFrame(gameLoop);
    containPlayer();
    switch(wallCollision()) {
    case "TOP":
        player.y -= PLAYER_HEIGHT/2;
        break;
    case "BOTTOM":
        player.y += PLAYER_HEIGHT/2;
        break;
    case "RIGHT":
        player.x -= PLAYER_WIDTH/2;
        break;
    case "LEFT":
        player.x += PLAYER_WIDTH/2;
        break;
    default:
        break;
    }
    player.x += player.vx * player.speed;
    player.y += player.vy * player.speed;

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

socket.on('updateId', function(data) {
    myId = data.myId;
    console.log("myID: " + myId);
});

socket.on("mapData", function(data) {
    for (var tile = 0; tile < 2500; tile++) {
        var x = tile % 50;
        var y = Math.floor(tile/50);

        if (data.mapData.charAt(tile) == "2") {
            spawnX = x * WALL_WIDTH;
            spawnY = y * WALL_HEIGHT;
        }

        if (data.mapData.charAt(tile) == "1") {
            mapWalls.push([x*WALL_WIDTH,y*WALL_HEIGHT]);
        }
    }

});
