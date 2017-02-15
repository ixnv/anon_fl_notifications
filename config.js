const config = {
	HTTP_PORT: 8882,
	HTTPS_PORT: 8843,

    SSL_KEY: '',
	SSL_CERT: '',

	ANON_FL_DB: {
		host: 'localhost',
		port: 5432,
		database: 'anon_fl',
		user: 'anon_fl',
		password: 'anon_fl'
	},

	NOTIFICATION_DB: {
	    host: 'localhost',
        port: 27017,
        database: 'anon_fl',
        user: 'anon_fl',
        password: 'anon_fl'
    }
};

module.exports = config;
