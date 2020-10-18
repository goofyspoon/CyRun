
const http = require('http');
const express = require('express');
const socket = require('socket.io');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getLobbyUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socket(server);
const PORT = 3000 || process.anv.PORT;

app.use(express.static('views')); // Set static folder to /views

// Run when client connects
io.on('connection', socket => {
  console.log('New socket connection', socket.id); // Development purposes only. Delete this.
  socket.on('joinLobby', ({username, lobby}) => {
    // Check the lobby to ensure there will not be two users with the same name.
    var usernameExists = false;
    let usersInLobby = getLobbyUsers(lobby);
    for (var i = 0; i < usersInLobby.length; i++) {
      if (usersInLobby[i].username === username) {
        socket.emit('message', 'There already exists a user in lobby: \"' + lobby + '\" with the name: \"' + username + '\"');
        usernameExists = true;
        break;
      }
    }
    if (usernameExists) socket.disconnect();
    else {
      const user = userJoin(socket.id, username, lobby);
      socket.join(user.lobby);

      // Welcome current user
      socket.emit('message', 'Welcome to CyRun!');

      // Broadcast when a user connects
      socket.broadcast.to(user.lobby).emit('message', user.username + ' has joined the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });
    }// end else statement
  });

  // lobby chat -- TODO
  socket.on('lobbyMessage', (message) => {
    io.to(user.lobby).emit('message', message);
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.lobby).emit('message', user.username + ' has left the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
