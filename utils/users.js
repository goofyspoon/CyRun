const users = [];

//Join user
function userJoin(id, username, lobby)  {
  var user = {id,
                username,
                lobby,
                playerRole : -1,
                index: -1,
                direction: 0,
                queue: 0,
                prevPosType: 0,
                prevIndex: -1,
                status: 0,
                score : 0
              };

  users.push(user);

  return user;
}

// Get current user (from id)
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

// Set player role (1-4)
function setPlayerNum(id, number){
  let index = users.findIndex(user => user.id === id);
  users[index].playerRole = number;
}

// Set Direction of player (not used right now)
function setDirection(id, xDir, yDir){
  let index = users.findIndex(user => user.id === id);
  users[index].xDirection = xDir;
  users[index].yDirection = yDir;
}

// Get index of user (from id)
function getIndex(id) {
  return getCurrentUser(id).index;
}

// Set index of user (id)
function setIndex(id, i)  {
  let index = users.findIndex(user => user.id === id);
  users[index].index = i;
}

// Get the direction of a user (0 none, -20 up, 1 right, 20 down, -1 left)
function getDirection(id) {
  if(getCurrentUser(id) != undefined)
    return getCurrentUser(id).direction;
}

// Set the direction of a user (0 none, -20 up, 1 right, 20 down, -1 left)
function setDirection(id, direction)  {
  let index = users.findIndex(user => user.id === id);
  users[index].direction = direction;
}

// Get the queue of a user (next direction) (0 none, -20 up, 1 right, 20 down, -1 left)
function getQueue(id) {
  if(getCurrentUser(id) != undefined)
    return getCurrentUser(id).queue;
}

// Set the direction of a user (0 none, -20 up, 1 right, 20 down, -1 left)
function queue(id, direction)  {
  let index = users.findIndex(user => user.id === id);
  users[index].queue = direction;
}

// Get prevIndex of user (from id)
function getPrevIndex(id) {
  return getCurrentUser(id).prevIndex;
}

// Set prevIndex of user (id)
function setPrevIndex(id, i)  {
  let index = users.findIndex(user => user.id === id);
  users[index].prevIndex = i;
}

// Get player status
function getStatus(id)  {
  return getCurrentUser(id).status;
}

// Set player status
function setStatus(id, status)  {
  let index = users.findIndex(user => user.id === id);
  users[index].status = status;
}

// Get prev position type (empty, dot, pill)
function getPrevPosType(id)  {
  return getCurrentUser(id).prevPosType;
}

// Get prev position type (empty, dot, pill)
function setPrevPosType(id, type)  {
  let index = users.findIndex(user => user.id === id);
  users[index].prevPosType = type;
}

// Get score of a player
function getScore(id) {
  return getCurrentUser(id).score;
}

// Increment score of a player
function incrementScore(id, amount) {
  let index = users.findIndex(user => user.id === id);
  users[index].score += amount;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getLobbyUsers,
  setPlayerNum,
  getIndex,
  setIndex,
  getDirection,
  setDirection,
  getQueue,
  setQueue,
  getPrevIndex,
  setPrevIndex,
  getPrevPosType,
  setPrevPosType,
  getStatus,
  setStatus,
  getScore,
  incrementScore
};
