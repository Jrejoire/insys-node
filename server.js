var express = require('express');
const cors = require("cors");
const mongoose = require("mongoose");
const socketIo = require("socket.io");

let User = require('./models/user-model');
let Table = require('./models/table-model');

require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(cors());

const uri = process.env.ATLAS_URI;
/*mongoose.connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})*/

var server = app.listen(port, () => console.log(`Listening to server ${port}`));

var io = require('socket.io').listen(server);
var openTables = {
    /*demo: {
        _id: "demo",
        player1: "jrej",
        player2: "miniaturena",
        player1Army: "rebels",
        player2Army: "tabForces",
        player1Units: ["OTTMK","OTTMK","OTTMK"],
        player2Units: ["STLRW","STLRW","STLRW"],
        player1Minis: [],
        player2Minis: [],
        player1TurnActions: 6,
        player2TurnActions: 6,
        player1StartActions: 6,
        player2StartActions: 6,
        history: [],
        player1InitRoll: 6,
        player2InitRoll: 2,
        currentPlayer: {name: "jrej", team: "teamWhite"},
        teamWhite: "player1",
        teamBlack: "player2",
        initWinner: "jrej",
        map: "Containers",
        playerTime: 1500,
        maxVal: 10,
        createdAt: Date.now(),
        isFull: true,
        gameUrl: "/game?table=demo"
    }*/
};

io.on("connection", function (socket) {
    // player has connected
    console.log("Player connected");

    socket.on("disconnect", function () {
        console.log("Player disconnected");
    });
    
    socket.on('createTable', (table) => {
        io.emit('createdTable', table);
    })
    
    socket.on('deleteTable', (tableId, noRedirect) => {
        io.emit('deletedTable', tableId);
        if (!noRedirect) {
            console.log("redirecting home");
            io.sockets.in(tableId).emit("redirect", `/`);
        }
    })

    socket.on('checkJoin', (tableId) => {
        if (io.sockets.adapter.rooms[tableId] && !io.sockets.adapter.rooms[tableId].sockets[socket.id]) {
            socket.join(tableId);
        } 
    })
    
    socket.on('joinTable', (tableId, player2) => {
        console.log(`user joined table ${tableId}`);
        socket.join(tableId);
        
        //setting player 2;
        if (player2 && openTables[tableId] && !openTables[tableId].isFull) {
            openTables[tableId].player2 = player2;
            openTables[tableId].isFull = true;  
        }
        // redirect to armybuilder (miniaturena.com/build?table=tableId);
        if (openTables[tableId] && socket.adapter.rooms[tableId].length === 2) {
            openTables[tableId].gameUrl = `/build?table=${tableId}`;
            io.sockets.in(tableId).emit("redirect", `/build?table=${tableId}`)
        }
    });
        
    socket.on('setArmy', (tableId, player, selection, army) => {
        if (selection.length > 0){
            console.log(`${player} from table ${tableId} is ready.`);
        } else {
            console.log(`${player} from table ${tableId} is not ready.`);
        }
         
         // once teams are selected redirect to miniaturena.com/init?table=dsdsdsfsdcsfds
        if (openTables[tableId] && openTables[tableId].player1 === player){
            openTables[tableId].player1Units = selection;
            openTables[tableId].player1Army = army;
            openTables[tableId].player1StartActions = selection.length * 2;
            openTables[tableId].player1TurnActions = selection.length * 2;

            if (openTables[tableId].player2Units && openTables[tableId].player2Units.length > 0) {
                openTables[tableId].gameUrl = `/init?table=${tableId}`;
                io.sockets.in(tableId).emit("redirect", `/init?table=${tableId}`);
            }   
        } else if (openTables[tableId] && openTables[tableId].player2 === player) {
            openTables[tableId].player2Units = selection;
            openTables[tableId].player2Army = army;
            openTables[tableId].player2StartActions = selection.length * 2;
            openTables[tableId].player2TurnActions = selection.length * 2;

            if (openTables[tableId].player1Units && openTables[tableId].player1Units.length > 0) {
                openTables[tableId].gameUrl = `/init?table=${tableId}`;
                io.sockets.in(tableId).emit("redirect", `/init?table=${tableId}`);
            }   
        }       
    })

    socket.on('initRoll', (tableId, player, roll) => {
        
        const compareRolls = () => {
            if (openTables[tableId].player1InitRoll > 0 && openTables[tableId].player2InitRoll > 0) {
                //compare rolls if equal send try again else declare winner
                if (openTables[tableId].player1InitRoll > openTables[tableId].player2InitRoll) {
                    //player1 wins
                    openTables[tableId].initWinner = openTables[tableId].player1;
                    io.sockets.in(tableId).emit("initRollWinner", openTables[tableId].player1);
                    return openTables[tableId].player1
                } else if (openTables[tableId].player1InitRoll < openTables[tableId].player2InitRoll) {
                    //player2 wins
                    openTables[tableId].initWinner = openTables[tableId].player2;
                    io.sockets.in(tableId).emit("initRollWinner", openTables[tableId].player2);
                    return openTables[tableId].player2
                } else if (openTables[tableId].player1InitRoll === openTables[tableId].player2InitRoll) {
                    //try again
                    io.sockets.in(tableId).emit("initRollWinner", "none");
                    return null
                }
            }
        }

        if (player && roll) {
            //inform other player of roll
            console.log(`${player} rolled init ${roll} at table ${tableId}`);
            socket.to(tableId).emit("opponentInitRoll", player, roll);

            //save init roll in table info
            if (openTables[tableId] && openTables[tableId].player1 === player){
                if (!openTables[tableId].player1InitRoll || openTables[tableId].player1InitRoll === openTables[tableId].player2InitRoll) {
                    openTables[tableId].player1InitRoll = roll;
                    compareRolls();
                } 
            } else if (openTables[tableId] && openTables[tableId].player2 === player) {
                if (!openTables[tableId].player2InitRoll || openTables[tableId].player1InitRoll === openTables[tableId].player2InitRoll) {
                    openTables[tableId].player2InitRoll = roll;
                    compareRolls();
                }
            }
        }
    });
   
   //wait for color team selection then redirect to game.
    socket.on('initGame', (tableId, firstPlayer) => {
        if (openTables[tableId]) {
            openTables[tableId].teamWhite = firstPlayer;
            openTables[tableId].teamBlack = firstPlayer === "player1" ? "player2" : "player1";
            openTables[tableId].currentPlayer = {name: openTables[tableId][firstPlayer], team: "teamWhite"}
            // finally starting the game redirect to miniaturena.com/game?table=dsdsdsfsdcsfds 
            openTables[tableId].gameUrl = `/game?table=${tableId}`;
            io.sockets.in(tableId).emit("redirect", `/game?table=${tableId}`);
        }
    });

    socket.on('movePlayerMini', (tableId, miniId, team, position, rotation, decor) => {
        if (openTables[tableId]) {
            openTables[tableId][`${openTables[tableId][team]}Minis`].forEach(mini => {
                if (mini.id === miniId) {
                    mini.position = position;
                    mini.rotation = rotation;
                    if (decor) {
                        mini.name = "decor"
                    }
                }
            });
            socket.to(tableId).emit("moveMini", { miniId, team, position, rotation });
        }
    });

    socket.on('removeTurnAction', (tableId, team) => {
        if (openTables[tableId]) {
            openTables[tableId][`${openTables[tableId][team]}TurnActions`] -= 1;
            socket.to(tableId).emit("removeTurn", team);
        }
    });

    socket.on('setCurrentPlayer', (tableId, currentPlayer) => {
        if (openTables[tableId]) {
            openTables[tableId].currentPlayer = currentPlayer;
            socket.to(tableId).emit("currentPlayer", currentPlayer);
        }
    });

    socket.on('resetTurnActions', (tableId, team) => {
        if (openTables[tableId]) {
            console.log("reset");
            openTables[tableId][`${openTables[tableId][team]}TurnActions`] = openTables[tableId][`${openTables[tableId][team]}StartActions`];
            socket.to(tableId).emit("resetTurn", team);
        }
    });

    socket.on('removePlayerMini', (tableId, id, team) => {
        if (openTables[tableId]) {
            openTables[tableId][`${openTables[tableId][team]}StartActions`] = openTables[tableId][`${openTables[tableId][team]}Minis`].length * 2;
            io.sockets.in(tableId).emit("removeMini", id, team);
        }
    });

    socket.on('log', (tableId, string) => {
        if (openTables[tableId]) {
            openTables[tableId].history.push(string);
            socket.to(tableId).emit("historyLog", string);
        }
    });

    socket.on('removeMesh', (tableId, name) => {
        socket.to(tableId).emit("removeToken", name);
    });

    socket.on('importActionTokens', (tableId) => {
        socket.to(tableId).emit("importTokens");
    });

    socket.on('cloneDice', (tableId, rolls, miniTeam, miniPosition, delay, save) => {
        socket.to(tableId).emit('cloneMesh', rolls, miniTeam, miniPosition, delay, save);
    });

    socket.on('selection', (tableId, meshId) => {
        socket.to(tableId).emit('select', meshId);
    });

    socket.on('cancelSelection', (tableId) => {
        socket.to(tableId).emit('cancelSelect');
    });

    socket.on('assignTarget', (tableId, meshId) => {
        socket.to(tableId).emit('assigningTarget', meshId);
    });

    socket.on('cancelTargeting', (tableId) => {
        socket.to(tableId).emit('cancelTargets');
    });

    socket.on('clearTarget', (tableId, meshId, selectedId) => {
        socket.to(tableId).emit('clearingTarget', meshId, selectedId);
    });

    socket.on('addImportedMini', (tableId, team, miniData) => {
        if (openTables[tableId] && !openTables[tableId][`${openTables[tableId][team]}Minis`].some(mini => mini.id === miniData.id)) {
            openTables[tableId][`${openTables[tableId][team]}Minis`].push(miniData);
        }
    });

    socket.on('gameOver', (tableId, winner, noRedirect) => {
        socket.to(tableId).emit('battleReport', winner , noRedirect);
    });

});

app.get('/', async (req, res) => {
    res.send('App init');
});

app.get('/table', async (req, res) => {
    try {
        //possible params player or tableId
        var player = req.query.player;
        var tableId = req.query.tableId;
        if (player) {
            let playerTable = Object.values(openTables).filter(table => table.player1 === player || table.player2 === player)[0];
            if (playerTable) {
                return res.json(
                    playerTable
                )
            } else {
                return res.json({})
            }
        } else if (tableId) {
            return res.json(
                openTables[tableId]
            )
        } else {
            return res.json(
                Object.values(openTables)
            )
        }
    } catch (err) {
        res.status(500).json('Error: ' + err)
    }
});

app.post('/table/create', async function (req, res) {
    try {
        const { player1 } = req.body;

        const existingTable = await Object.values(openTables).filter(table => table.player1 === player1);
        if (existingTable.length > 0) {
            return res.status(400).json({ msg: `A table created by ${player1} already exists.` })
        }

        console.log(`Table created by ${player1}.`)
        const newTable = new Table({
            player1
        });

        if (newTable) {
            openTables[newTable._id] = newTable;
            return res.json(newTable)
        }
    } catch (err) {
        res.status(500).json('Error: ' + err)
    }
});

app.delete('/table/delete', async function (req, res) {
    try {
        const { tableId } = req.body;
        console.log(`Delete table ${tableId}.`);
        delete openTables[tableId];
        return res.json(tableId)
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})