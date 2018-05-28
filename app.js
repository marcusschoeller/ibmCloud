var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var userlist = [];
var roomlist = [];

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// use the body parser to access the body elements (form elements)
// app.use(bodyParser.urlencoded({ extended: false }));

// Listen ------------------------------------------------------
// start server on the specified port and binding host
var port = process.env.PORT || 3000;
http.listen(port, '0.0.0.0', function() {
	console.log("server starting on " + port);
});

// Handlers ------------------------------------------------------

/**
 * Index handler
 */
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

/**
 * Chat handler
 */
app.get('/chat', function(req, res) {
	res.sendFile(__dirname + '/public/chat.html');
});

/**
 * Request handler
 */
io.sockets.on('connection', function(socket) {

	// send message
	socket.on('chat message', function(msg, username, room) {
		/* Sanitize input */
		msg = msg.replace('<', '');
		msg = msg.replace('>', '');

		var time = getNow();
		var user = getUserObject(username);
		user.socket = socket;

		io.to(room).emit('chat message', msg, time, username);
	});

	socket.on('handshake', function(username, chatroom) {
		socket.username = username;
		socket.join(chatroom);
	});

	// Method that is called when the user logs in
	socket.on('login', function(user, password, chatroom) {
		var pass = false;
		var existingRoom = getRoomByName(chatroom.name);
		if (existingRoom === undefined) {
			chatroom.pwd = password;
			roomlist.push(chatroom);
			pass = true;
		} else {
			if (existingRoom.pwd === password) {
				pass = true;
			}
		}
		if (pass) {
			var existingUser = getUserObject(user.name);
			if (existingUser === undefined) {
				user.socket = socket;
				userlist.push(user);
			} else {
				existingUser.socket = socket;
			}
			io.to(chatroom.name).emit('info', user.name + ' connected',
					getNow(), 'WeChat');
			socket.emit('login', chatroom.name);
		} else {
			socket.emit('loginFalse', chatroom.name);
		}
	});

	// Method that returns the user list
	socket.on('list', function(room) {
		var content = 'Connected Users:';
		var clients = io.sockets.adapter.rooms[room];
		for ( var clientID in clients) {
			try{
				var userSocket = io.sockets.connected[clientID];
				content = content + '<br>' + userSocket.username;
			} catch(Exception){
				content = 'Sorry, we are currently not able to get the user list.';
			}
		}
		socket.emit('info', content, getNow(), 'WeChat');
	});

	// Method that is called when a user disconnects
	socket.on('remove', function(username, room) {
		io.to(room).emit('info', username + ' disconnected', getNow(), 'WeChat');
		socket.leave(room);
		removeUser(username);
	});

});

// Methods ------------------------------------------------------
/**
 * Get the current time
 * 
 * @returns {String} with the current time
 */
function getNow() {
	var date = new Date();

	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;

	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;

	var time = hour + ":" + min;

	return time;
}

/**
 * Returns the user object for a given user name
 * 
 * @param username
 *            the users name
 * @returns a user object
 */
function getUserObject(username) {
	var index;
	for (index = 0; index < userlist.length; index++) {
		var user = userlist[index];
		if (username === user.name) {
			return user;
		}
	}
}

/**
 * Returns the room object for a given name
 * 
 * @param name
 *            the rooms name
 * @returns a room object
 */
function getRoomByName(name) {
	var i;
	for (i = 0; i < roomlist.length; i++) {
		var aRoom = roomlist[i];
		if (aRoom.name === name) {
			return aRoom;
		}
	}
}

/**
 * Remove user with given name
 * 
 * @param username
 *            name of the user to be removed
 */
function removeUser(username) {
	var user = getUserObject(username);
	var index = userlist.indexOf(user);
	if (index >= 0) {
		userlist.splice(index, 1);
	}
}
