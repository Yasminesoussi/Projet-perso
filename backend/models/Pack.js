const mongoose = require("mongoose");

const PackSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    prix: {
        type: Number,
        required: true
    },
    nbTickets: {
        type: Number,
        required: true
    },
    actif: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Pack", PackSchema);
