
const http = require('http');
const express = require('express');
const socket = require('socket.io');
const Constants = require('./Constants.js');
const {
  userJoin,
  getCurrentUser,
  getCoords,
  userLeave,
  getLobbyUsers,
  setPlayerNum,
  setCoords,
  setDirection,
  getIndex,
  setIndex
} = require('./utils/users');
const { create } = require('hbs');

var gameBoard = new Array(Constants.LEVEL1.length);
var dotCount;



const app = express();
const server = http.createServer(app);
const io = socket(server);
const PORT = 3000 || process.anv.PORT;
const CANVAS_HEIGHT = 650;
const CANVAS_WIDTH = 550;

app.use(express.static('views')); // Set static folder to /views

// Run when client connects
io.on('connection', socket => {
  console.log('New socket connection', socket.id); // Development purposes only. Delete this.
  socket.on('joinLobby', ({username, lobby}) => {
    // Check the lobby to ensure there will not be two users with the same name or there are already 4 users in the lobby
    var entranceFailure = false;
    let usersInLobby = getLobbyUsers(lobby);
	if (usersInLobby.length >= 4)	{
    console.log("Rejected player because lobby is full.");
		socket.emit('message', 'The lobby, ' + lobby + ', is full')
		entranceFailure = true;
	}
    for (var i = 0; i < usersInLobby.length && !(entranceFailure); i++) {
      if (usersInLobby[i].username === username) {
        socket.emit('message', 'There already exists a user in lobby: \"' + lobby + '\" with the name: \"' + username + '\"');
        entranceFailure = true;
        console.log("Rejected player due to repeat of username.");
        break;
      }
    }
    if (entranceFailure) socket.disconnect();
    else {
      var startingPos =0;
          if(usersInLobby.length == 1){
            startingPos = 109;
          }else if(usersInLobby.length == 2){
            startingPos = 110;
          }else if(usersInLobby.length == 3){
            startingPos = 111;
          }else{
            startingPos = 180;
          }
      const user = userJoin(socket.id, username, lobby, startingPos);
      console.log("Starting position is: " + startingPos);
      socket.join(user.lobby);

      // Welcome current user to lobby
      socket.emit('message', 'Welcome to CyRun lobby ' + user.lobby);
      console.log("User "+ user.username+ "joined.");

      // Broadcast when a user connects
      socket.broadcast.to(user.lobby).emit('message', user.username + ' joined the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });
      console.log("Sent users in lobby the user and lobby information from server.");

      //socket.emit('loadBoard');
      console.log("Asked users to loadbBoard.");

      if(getLobbyUsers(user.lobby).length == 4){
        console.log("There are now four users. Let's get started.");
        let users = getLobbyUsers(user.lobby);
        setRoles(user, users);
      }
    }// end else statement
  });

  function setRoles(user, users){
        for(let i = 0; i < 4; i++){
          setPlayerNum(users[i].id, i + 1);
          setDirection(users[i].id, 0, 0);
        
    //First player will start at left ghost spot
    if(i == 0){
      setCoords(users[i].id, CANVAS_WIDTH/2 - 52, CANVAS_HEIGHT*2/5 + 25);
      console.log("Setting "+users[i].username + " as red ghost.");
    //Second player will start at middle ghost spot
    }else if(i == 1){
      setCoords(users[i].id, CANVAS_WIDTH/2 - 18, CANVAS_HEIGHT*2/5 + 25);
      console.log("Setting "+users[i].username + " as blue ghost.");
    //Third player will start at right ghost spot
    }else if(i == 2){
      setCoords(users[i].id, CANVAS_WIDTH/2 + 18, CANVAS_HEIGHT*2/5 + 25);
      console.log("Setting "+users[i].username + " as orange ghost.");
    //Last player will be pacman
    }else{
      setCoords(users[i].id, CANVAS_WIDTH/2 - 18, CANVAS_HEIGHT*3/4 - 15);
      console.log("Setting "+users[i].username + " as pacymany.");
    }
  }
  createGameBoard();
  //socket.broadcast.to(user.lobby).emit('drawGameBoard', ({gameBoard}));
    //io.to(user.lobby).emit('startGame', (getLobbyUsers(user.lobby)));
    io.to(user.lobby).emit('drawGameBoard', ({gameBoard}));
    console.log("Emit to users to drawGameBoard, passing gameBoard array.");

    //socket.broadcast.to(user.lobby).emit('hey', ({}));
    io.to(user.lobby).emit('hey', ({}));
    //gameloop();
  }


  function createGameBoard(){
    //gameBoard
    console.log("in createGameBoard.");
    gameBoard = Constants.LEVEL1;
    //gameBoard.forEach(element => gameBoard[element] = Constants.LEVEL1[element]);

    console.log("LEVEL1[0]=" + Constants.LEVEL1[0]);
    console.log("LEVEL1[1]="+ Constants.LEVEL1[1]);
    console.log("LEVEL1[2]="+ Constants.LEVEL1[2]);

    console.log("gameBoard[0]=" + gameBoard[0]);
    console.log("gameBoard[1]="+ gameBoard[1]);
    console.log("gameBoard[2]="+ gameBoard[2]);
    //gameBoard.forEach(element => console.log(element));

  }

  function addObject(position, object){
    gameBoard[position].classList.add(...classes);
  }

  function removeObject(position, object){
    gameBoard[position].classList.remove(...classes);
  }

  function objectExist(position, object){
    return gameBoard[position].classList.contains(object);
  }


  // Lobby chat
  // lobby chat -- normal message
  socket.on('lobbyMessage', ({username, message}) => {
    const user = getCurrentUser(socket.id);
    io.to(user.lobby).emit('message', username + ': ' + message);
  });


  // Adjusts the direction for a player
  socket.on('changeDirection', (direction) => {
    const user = getCurrentUser(socket.id);
    if (direction === 'up')
      setDirection(user.id, 0, -1);
    else if(direction === 'down')
      setDirection(user.id, 0, 1);
    else if(direction === 'left')
      setDirection(user.id, -1, 0);
    else if(direction === 'right')
      setDirection(user.id, 1, 0);

	// Calculate new position for user
	var newX = user.xCoord + user.xDirection;
	var newY = user.yCoord + user.yDirection;
	setCoords(user.id, newX, newY);

    // emit the players new position to everyone in the lobby
    io.to(user.lobby).emit('gameUpdate', {
      lobby: user.lobby,
      users: getLobbyUsers(user.lobby),
      gameBoard: gameBoard
    });
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.lobby).emit('message', user.username + ' left the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });
    }
  });// Do not put anything below socket.on(disconnect)
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
