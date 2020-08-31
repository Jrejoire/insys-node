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
var openTables = [];

io.on("connection", function (socket) {
    // player has connected
    console.log("Player connected");

    socket.on('joinTable', (tableID) => {
        console.log(`user joined table ${tableID}`)
        socket.join(tableID)
    })

    socket.on("disconnect", function () {
        console.log("Player disconnected");
    });

    socket.on('createTable', (table) => {
        io.emit('createdTable', table);
    })

    socket.on('deleteTable', (table) => {
        io.emit('deletedTable', table);
    })
    
    socket.on('joinTable', (tableID) => {
        socket.join(tableID);
    })
    
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
        return res.json({
            openTables
        })
    } catch (err) {
        res.status(500).json('Error: ' + err)
    }
});

app.post('/table/create', async function (req, res) {
    try {
        const { player1 } = req.body;
        console.log(`Table created by ${player1}.`)

        const existingTable = await openTables.filter(table => table.player1 === player1);
        if (existingTable.length > 0) {
            return res.status(400).json({ msg: `A table created by ${player1} already exists.` })
        }
        
        const newTable = new Table({
            player1
        });

        if (newTable) {
            openTables.push(newTable);
            return res.json({newTable})
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
        const { player } = req.body;
        console.log(`Delete ${player}'s table.`);
        /*const deletedTable = await Table.findByIdAndDelete(tableID);
        res.json(deletedTable);*/
        const deletedTable = openTables.filter(table => table.player1 === player);
        openTables = openTables.filter(table => table.player1 !== player);
        return res.json({deletedTable})
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

