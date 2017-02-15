"use strict";

const app = require('express')();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
const bodyParser = require('body-parser');
const config = require('./config');
const fs = require('fs');
// const options = {
//   key: fs.readFileSync(config.SSL_KEY),
//   cert: fs.readFileSync(config.SSL_CERT)
// };
// const httpsServer = require('https').createServer(options, app);

const mongoose = require('mongoose');
const pg = require('pg');
const dbClient = new pg.Client(config.ANON_FL_DB);

const Notification = require('./models/Notification');
const _map = require('lodash.map');

// init
(() => {
    httpServer.listen(config.HTTP_PORT);
// httpsServer.listen(config.HTTPS_PORT);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    dbClient.connect(err => {
        if (err) {
            throw err;
        }

        console.log('DB: connection established');
    });

    mongoose.connect(`mongodb://${config.NOTIFICATION_DB.host}:${config.NOTIFICATION_DB.port}/${config.NOTIFICATION_DB.database}`, {
        user: config.NOTIFICATION_DB.user,
        pass: config.NOTIFICATION_DB.password
    });
})();


io.on('connection', socket => {
	const token = socket.request._query.token;

	if (!token) {
		return;
	}

	// TODO: replace with JWT?
	dbClient.query("SELECT user_id FROM authtoken_token WHERE key = $1::text", [token], (err, result) => {
		if (err) {
			throw err;
		}

		const res = result.rows[0];
		if (!res.hasOwnProperty('user_id')) {
			return;
		}

        const user_id = res.user_id;
		socket.user_id = user_id;
		socket.chat_ids = [];

		io.sockets.connected[user_id] = socket;
        let notifications = [];

		Notification.find({user_id, is_notified: false}, (err, result) => {
            notifications = result;

            if (!notifications.length) {
                return;
            }

            const ids = _map(notifications, '_id');
            Notification.update({_id: {$in: ids}}, {is_read: true}, {multi: true});
        });

		socket.emit('NEW_UNREAD_NOTIFICATIONS', notifications);

		console.log(`[user_id: ${socket.user_id}] joined`);
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
            console.log(`[user_id: ${socket.user_id}] left`);
        }
    };

	socket.on('leave', leave);
	socket.on('disconnect', leave);
});


// TODO: client can send here any data, accept requests only from whitelisted ips (e.g., localhost)
app.post('/notify', (req, res) => {
	const {user_ids, data, key} = req.body;

	user_ids.map(user_id => {
        const is_connected = io.sockets.connected[user_id] !== undefined;

        if (!is_connected) {
            Notification.create({
                type: key,
                is_notified: false,
                user_id,
                data
            }, (err, notification) => {
                console.log(err);
                console.log(notification);
            });
            return;
        }

		io.sockets.connected[user_id].emit(key, data);
		console.log(`Notify sent: [user_id: ${user_id}, event_key: ${key}]`);
	});

	res.json({
        status: 'OK'
	});
});
