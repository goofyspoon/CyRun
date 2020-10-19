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

// The eventlistener has beeen moved to the app.js
/*
function bindKeyPress(){
  document.addEventListener('keydown', function(event) {
    if (event.keyCode == 37) {
        alert('Left was pressed');

    }
    else if (event.keyCode == 38) {
        alert('Up was pressed');
    }
    else if (event.keyCode == 39) {
        alert('Right was pressed');
    }
    else if (event.keyCode == 40) {
        alert('Down was pressed');
    }
}, true);
}*/
