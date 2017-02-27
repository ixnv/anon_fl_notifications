"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const types = ['ORDER_CHAT_NEW_MESSAGE', 'ORDER_APPLICATION_APPROVED', 'ORDER_APPLICATION_DECLINED', 'ORDER_APPLICATION_REQUEST_RECEIVED'];

const Notification = mongoose.model('Notification', new Schema({
    user_id: {
        type: Number,
        required: true,
        index: true
    },
    entity_id: {
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
    is_notified: {
        type: Boolean,
        default: false
    },
    data: Schema.Types.Mixed,
}));

module.exports = Notification;
