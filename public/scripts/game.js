// Aliases
var Container = PIXI.Container,
    autoDetectRenderer = PIXI.autoDetectRenderer,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Rectangle = PIXI.Rectangle,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    EZcomponents = EZGUI.components,
    EZcreate = EZGUI.create,
    EZtheme = EZGUI.Theme;

// use socket.io
var socket = io.connect();

var player = new Sprite();
var boardBackground;
var WIDTH = 800, HEIGHT = 500;
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

// set EZGUI renderer
EZGUI.renderer = renderer;

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

    // PIXI text
    //var input = new PIXI.Input();
    //input.x = 10;
    //input.y = 10;
    //console.log(input.value);
    //stage.addChild(input);


    //Capture the keyboard arrow keys
    var left = keyboard(37),
        up = keyboard(38),
        right = keyboard(39),
        down = keyboard(40),
        space = keyboard(32),
        enter = keyboard(13);

    for (var p in players) {
        newPlayer(p);
    }

    var chatGUI = {
        id: 'chatWindow',

        component: 'Window',

        //component position relative to parent
        position: { x: 510, y: 10 },


        width: 280,
        height: 480,

        children: [
            null,
            {
                id: 'input',
                text: '',
                component: 'Input',
                position: 'bottom left',
                width: 140,
                height: 50
            },
            {
                id: 'send',
                text: 'Send',
                component: 'Button',
                position: 'bottom right',
                width: 140,
                height: 50
            }
        ]
    };


    EZtheme.load(['assets/metalworks-theme/metalworks-theme.json'], function () {

        //create the gui
        //the second parameter is the theme name, see kenney-theme.json, the name is defined under __config__ field
        var guiElt = EZGUI.create(chatGUI, 'metalworks');

        EZcomponents.send.on('click', function (event) {
            sendMessage(EZcomponents.input);
        });

        stage.addChild(guiElt);

    });

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

    //enter
    enter.press = function() {
        sendMessage(EZcomponents.input);
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
    };

    //The `upHandler`
    key.upHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }
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
    var collision = false;
    // check for y
    if (player.y + player.vy < WALL_HEIGHT) {
        //top
        collision = true;
    }
    else if (player.y + player.vy + PLAYER_HEIGHT > HEIGHT - WALL_HEIGHT) {
        // bottom
        collision = true;
    }

    if (player.scale.x === 1) {
        if (player.x + player.vx < WALL_WIDTH) {
            //left
            collision = true;
        }
        else if (player.x + player.vx + PLAYER_WIDTH > WIDTH - WALL_WIDTH) {
            // right
            collision = true;
        }

    }

    if (player.scale.x === -1) {
        if (player.x + player.vx - PLAYER_WIDTH < WALL_WIDTH) {
            // left
            collision = true;
        }
        else if (player.x + player.vx > WIDTH - WALL_WIDTH) {
            // right
            collision = true;
        }
    }
    return collision;
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
    var collision = false;
    for (var wallTile in mapWalls) {
        var wallX = mapWalls[wallTile][0];
        var wallY = mapWalls[wallTile][1];

        // player incoming from the right side of the wall
        if (player.x >= wallX + WALL_WIDTH &&
            player.x + player.vx <= wallX + WALL_WIDTH) {

            // top of player
            if (player.y >= wallY && player.y <= wallY + WALL_HEIGHT) {
                collision = true;
            }
            // bottom of player
            else if (player.y + PLAYER_HEIGHT >= wallY &&
                     player.y + PLAYER_HEIGHT <= wallY + WALL_HEIGHT) {
                collision = true;
            }
        }

        // player incoming from the left side of the wall
        else if (player.x + PLAYER_WIDTH <= wallX &&
                 player.x + PLAYER_WIDTH + player.vx >= wallX) {

            // top of player
            if (player.y >= wallY && player.y <= wallY + WALL_HEIGHT) {
                collision = true;
            }

            // bottom of player
            else if (player.y + PLAYER_HEIGHT >= wallY &&
                     player.y + PLAYER_HEIGHT <= wallY + WALL_HEIGHT) {
                collision = true;
            }
        }

        // player incoming from the top of the wall
        else if (player.y + PLAYER_HEIGHT <= wallY &&
                 player.y + PLAYER_HEIGHT + player.vy >= wallY) {

            // left side of the player
            if (player.x >= wallX && player.x <= wallX + WALL_WIDTH) {
                collision = true;
            }

            // right side of player
            else if (player.x + PLAYER_WIDTH >= wallX &&
                     player.x + PLAYER_WIDTH <= wallX + WALL_WIDTH) {
                collision = true;
            }
        }

        // player incoming from the bottom of the wall
        else if (player.y >= wallY + WALL_HEIGHT &&
                 player.y + player.vy <= wallY + WALL_HEIGHT) {

            // left side of the player
            if (player.x >= wallX && player.x <= wallX + WALL_WIDTH) {
                collision = true;
            }

            // right side of player
            else if (player.x + PLAYER_WIDTH >= wallX &&
                     player.x + PLAYER_WIDTH <= wallX + WALL_WIDTH) {
                collision = true;
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

function sendMessage(inputBox) {
    if(inputBox.text !== "") {
        socket.emit('sendMessage', {'message': EZcomponents.input.text});
        inputBox.text = "";
    }
}

gameLoop();
function gameLoop() {

    if (!containPlayer() && !wallCollision()) {
        player.x += player.vx * player.speed;
        player.y += player.vy * player.speed;
    }

    requestAnimationFrame(gameLoop);
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

socket.on('displayMessages', function(data) {
    console.log(data.messages);
});

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
