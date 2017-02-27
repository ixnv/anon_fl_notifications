"use strict";

// const fs = require('fs');
// const options = {
//   key: fs.readFileSync(process.env.SSL_KEY),
//   cert: fs.readFileSync(process.env.SSL_CERT)
// };
// const httpsServer = require('https').createServer(options, app);

const env = require('dotenv').config();

const app = require('express')();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

const bodyParser = require('body-parser');

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Notification = require('./models/Notification');

// init
(() => {
// httpsServer.listen(process.env.APP_HTTPS_PORT);
    httpServer.listen(process.env.APP_HTTP_PORT);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    mongoose.connect(`mongodb://${process.env.NOTIFICATION_DB_HOST}:${process.env.NOTIFICATION_DB_PORT}/${process.env.NOTIFICATION_DB_NAME}`, {
        user: process.env.NOTIFICATION_DB_USER,
        pass: process.env.NOTIFICATION_DB_PASSWORD
    });
})();


io.on('connection', socket => {
    const token = socket.request._query.token;

    if (!token) {
        return;
    }

    // TODO: use a cert
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return;
        }

        if (!decoded.hasOwnProperty('user_id')) {
            return;
        }

        const {user_id} = decoded;
        socket.user_id = user_id;
        socket.chat_ids = [];

        io.sockets.connected[user_id] = socket;

        Notification.find({user_id, is_notified: false}, (err, result) => {
            socket.emit('NEW_UNREAD_NOTIFICATIONS', result);
        });
    });

    socket.on('joinChat', ({chat_id}) => {
        socket.chat_ids.push(chat_id);
    });

    socket.on('leaveChat', ({chat_id}) => {
        socket.chat_ids = socket.chat_ids.filter(_chat_id => _chat_id !== chat_id);
    });

    const leave = () => {
        if (io.sockets.connected[socket.user_id] !== undefined) {
            delete io.sockets.connected[socket.user_id];
        }
    };

    socket.on('leave', leave);
    socket.on('disconnect', leave);
});


// TODO: client can send here any data, accept requests only from whitelisted ips (e.g., localhost)
app.post('/notify', (req, res) => {
    const {user_ids, data, key, entity_id, token} = req.body;

    try {
        jwt.verify(token, process.env.JWT_API_SERVICE_SECRET);
    } catch (e) {
        return res.json({
            status: 'error',
            detail: 'INVALID_JWT'
        });
    }

    user_ids.map(user_id => {
        Notification.create({
            type: key,
            is_notified: false,
            entity_id: entity_id,
            user_id,
            data
        }, (err, notification) => {
            console.log(err);
        });

        if (io.sockets.connected[user_id] !== undefined) {
            io.sockets.connected[user_id].emit(key, data);    
        }
    });

    res.json({
        status: 'OK'
    });
});

// mark notifications as read
app.post('/notifications/read', (req, res) => {
    const {user_id, token} = req.body;

    try {
        jwt.verify(token, process.env.JWT_API_SERVICE_SECRET);
    } catch (e) {
        return res.json({
            status: 'error',
            detail: 'INVALID_JWT'
        });
    }

    Notification.find({user_id, is_notified: false}, {_id: 1}, (err, result) => {
        let ids = result;

        if (!ids.length) {
            return;
        }

        ids = ids.map(id => new mongoose.Types.ObjectId(id._id));

        // for some reason, Notification.update() does not work as expected, use raw connection
        mongoose.connection.db.collection('notifications').update({_id: {$in: ids}}, {$set: {is_notified: true}});
    });

    res.json({
        status: 'OK'
    })
});
