const users = [];

//Join user
function userJoin(id, username, lobby)  {
  const user = {id,
                username,
                lobby,
                playerRole : -1,
                xCoord : -1,
                yCoord : -1,
                xDirection : 0,
                yDirection : 0};

  users.push(user);

  return user;
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves lobby
function userLeave(id)  {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

//Get lobby Users
function getLobbyUsers(lobby) {
  return users.filter(user => user.lobby === lobby);
}

function getCoords(id){
  let users = users.filter(user => user.id === id);
  return {xCoord,
          yCoord};
}

function setPlayerNum(id, number){
  let index = users.findIndex(user => user.id === id);
  users[index].playerRole = number;
}

function setCoords(id, x, y){
  let index = users.findIndex(user => user.id === id);
  users[index].xCoord = x;
  users[index].yCoord = y;
}

function setDirection(id, xDir, yDir){
  let index = users.findIndex(user => user.id === id);
  users[index].xDirection = xDir;
  users[index].yDirection = yDir;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getLobbyUsers,
  setPlayerNum,
  setCoords,
  setDirection
};
