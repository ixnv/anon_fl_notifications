"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const types = ['ORDER_CHAT_NEW_MESSAGE', 'ORDER_APPLICATION_APPROVED', 'ORDER_APPLICATION_DECLINED'];

const Notification = mongoose.model('Notification', new Schema({
    user_id: {
        type: Number,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: types,
        index: true
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    amount: {
        type: Number,
        default: 1
    },
    data: Schema.Types.Mixed,
    is_notified: Boolean
}));

module.exports = Notification;
