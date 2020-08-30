const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        username: { type: String, required: true, unique: true},
        totalPlayed: { type: Number, required: true, default: 0},
        experience: { type: Number, required: true, default: 0},
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model('User', userSchema);