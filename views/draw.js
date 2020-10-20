function generateBoard(){
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var img1 = new Image();
  img1.src = './PacmanLevel.png';
  img1.onload = function () {
      //draw background image
      ctx.drawImage(img1, 0, 0, canvas.width, canvas.height);
  };
}

function initCharacters(){
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var characters = ["red_ghost", "blue_ghost", "orange_ghost", "pacman"];
  for(var i = 0; i < characters.length; i++){
    drawCharacter(i + 1, canvas, ctx, characters[i]);
  }
}

function drawCharacter(playernum, canvas, context, name){
  var xCoord, yCoord;
  //First player will start at left ghost spot
  if(playernum == 1){
    yCoord = canvas.height*2/5 + 25;
    xCoord = canvas.width/2 - 52;
  }
  //Second player will start at middle ghost spot
  else if(playernum == 2){
    yCoord = canvas.height*2/5 + 25;
    xCoord = canvas.width/2 - 18;
  }
  //Third player will start at right ghost spot
  else if(playernum == 3){
    yCoord = canvas.height*2/5 + 25;
    xCoord = canvas.width/2 + 18;
  }
  //Last player will be pacman
  else{
    yCoord = canvas.height*3/4 - 15;
    xCoord = canvas.width/2 - 18;
  }
  var image = new Image();
  var path = './' + name + '.png';
  image.src = path;
  image.onload = function () {
      //draw background image
      context.drawImage(image, xCoord, yCoord, 35, 35);
  };
}

var myGamePiece;
var myBackground;

function startGame() {
    myGamePiece = new component(30, 30, "smiley.gif", 10, 120, "image");
    myBackground = new component(656, 270, "citymarket.jpg", 0, 0, "background");
    myGameArea.start();
}

var myGameArea = {
    canvas : document.getElementById("canvas"),
    context : this.canvas.getContext("2d"),
    start : function() {
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        this.frameNo = 0;
        this.interval = setInterval(updateGameArea, 20);
        },
    clear : function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    stop : function() {
        clearInterval(this.interval);
    }
}

function component(width, height, color, x, y, type) {
    this.type = type;
    if (type == "image" || type == "background") {
        this.image = new Image();
        this.image.src = color;
    }
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.x = x;
    this.y = y;
    this.update = function() {
        ctx = myGameArea.context;
        if (type == "image" || type == "background") {
            ctx.drawImage(this.image,
                this.x,
                this.y,
                this.width, this.height);
        if (type == "background") {
            ctx.drawImage(this.image,
                this.x + this.width,
                this.y,
                this.width, this.height);
        }
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    this.newPos = function() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.type == "background") {
            if (this.x == -(this.width)) {
                this.x = 0;
            }
        }
    }
}

function updateGameArea() {
    myGameArea.clear();
    myBackground.newPos();
    myBackground.update();
    myGamePiece.newPos();
    myGamePiece.update();
}

function move(dir) {
    myGamePiece.image.src = "angry.gif";
    if (dir == "up") {myGamePiece.speedY = -1; }
    if (dir == "down") {myGamePiece.speedY = 1; }
    if (dir == "left") {myGamePiece.speedX = -1; }
    if (dir == "right") {myGamePiece.speedX = 1; }
}

function clearmove() {
    myGamePiece.image.src = "smiley.gif";
    myGamePiece.speedX = 0;
    myGamePiece.speedY = 0;
}
