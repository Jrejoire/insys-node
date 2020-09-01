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
mongoose.connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})

var server = app.listen(port, () => console.log(`Listening to server ${port}`));

var io = require('socket.io').listen(server);
var openTables = {};
var fullTables = {};

io.on("connection", function (socket) {
    // player has connected
    console.log("Player connected");

    socket.on("disconnect", function () {
        console.log("Player disconnected");
    });
    
    socket.on('createTable', (table) => {
        io.emit('createdTable', table);
    })
    
    socket.on('deleteTable', (tableId) => {
        io.emit('deletedTable', tableId);
    })
    
    socket.on('joinTable', (tableId, player2) => {
        console.log(`user joined table ${tableId}`);
        socket.join(tableId);
        
        //setting player 2;
        if (player2 && !openTables[tableId].isFull) {
            openTables[tableId].player2 = player2;
            openTables[tableId].isFull = true;
        }
        // redirect to armybuilder (miniaturena.com/build?table=tableId);
        if (socket.adapter.rooms[tableId].length === 2) {
            io.sockets.in(tableId).emit("redirect", `/build?table=${tableId}`)
        }
    })


    
    // once teams are selected redirect to miniaturena.com/init?table=dsdsdsfsdcsfds
    /*socket.on('initGame', (tableId, player, armyArray) => {
        let table = openTables.filter(table => table._id === tableId)[0];
        if (table.player1 === player){
            table.player1Army = armyArray;
        } else if (table.player2 === player) {
            table.player2Army = armyArray;
        }
        if (both players have sent their army array) {
            io.sockets.in(tableId).emit("builderRedirect", `/init?table=${tableId}`)
        }
    })*/
    
    // finally starting the game redirect to miniaturena.com/game?table=dsdsdsfsdcsfds 
    
    /*Table.watch().on('change', (change) => {
        io.emit('changes', change);
    })*/
});

app.get('/', async (req, res) => {
    res.send('App init');
});

app.get('/table', async (req, res) => {
    try {
        /*var tables = await Table.find({}, function (err, result) {
            if (err) {
                console.log(err);
            } else {
                return res.json({
                    result
                })
            }
        });*/
        return res.json(
            Object.values(openTables).filter(table => !table.isFull)
        )
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

        /*
        const existingTable = await Table.findOne({ player1: player1 })
        if (existingTable) {
            return res.status(400).json({ msg: `A table created by ${player1} already exists.` })
        }
        newTable.save(function (err, table) {
            if (err) return res.status(400).json('Error: ' + err);
            if (table) {
                console.log(table);
                return res.json({
                    table
                })
            }
        })*/
    } catch (err) {
        res.status(500).json('Error: ' + err)
    }
});

app.delete('/table/delete', async function (req, res) {
    try {
        const { tableId } = req.body;
        console.log(`Delete table ${tableId}.`);
        /*const deletedTable = await Table.findByIdAndDelete(tableID);
        res.json(deletedTable);*/
        delete openTables[tableId];
        return res.json(tableId)
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

