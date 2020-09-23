const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tableSchema = new Schema(
    {
        player1: { type: String, required: true },
        player2: { type: String },
        player1Army: { type: String },
        player2Army: { type: String },
        player1Units: [{ type: String }],
        player2Units: [{ type: String }],
        player1Minis: [],
        player2Minis: [],
        player1TurnActions: { type: Number },
        player2TurnActions: { type: Number },
        player1StartActions: { type: Number },
        player2StartActions: { type: Number },
        history: [{ type: String }],
        currentPlayer: { name: { type: String }, team: { type: String } },
        player1InitRoll: { type: Number, default: undefined },
        player2InitRoll: { type: Number, default: undefined },
        teamWhite: { type: String },
        teamBlack: { type: String },
        initWinner: { type: String },
        map: { type: String, default: "suburbia" },
        playerTime: { type: Number, default: 1500 },
        maxVal: { type: Number, default: 10 },
        createdAt: { type: String, default: Date.now},
        isFull: { type: Boolean, default: false},
        gameUrl: { type: String }
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model('Table', tableSchema);
