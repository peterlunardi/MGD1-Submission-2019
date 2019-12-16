var cvs = document.getElementById('gameCanvas');
var ctx = cvs.getContext("2d");

//load the images
//background and foreground
var background = new Image();
var bg2 = new Image();
var foreground = new Image();
//Player
var player = new Image();
//ROCKS---------------------
var rockUp = new Image();
var rockDown = new Image();
var snowRockUp = new Image();
var snowRockDown = new Image();
var grassRockUp = new Image();
var grassRockDown = new Image();
//game over transparent plane
var gameOverImg = new Image();
//particles!
var flakeImage = new Image();
var smokeImage = new Image();
//coins
var coinImage = new Image();

background.src = "images/background.png";
bg2.src = "images/background.png";
foreground.src = "images/foreground.png";
player.src = "images/planeRed1.png";
rockUp.src = "images/rockUp.png";
rockDown.src = "images/rockDown.png";
snowRockUp.src = "images/snowRockUp.png";
snowRockDown.src = "images/snowRockDown.png";
grassRockUp.src = "images/grassRockUp.png";
grassRockDown.src = "images/grassRockDown.png";
flakeImage.src = "images/flake.png";
smokeImage.src = "images/smoke.png";
gameOverImg.src = "images/gameover.png";
coinImage.src = "images/coin.png";

//AUDIO--
var planeNoise = new Audio();
var crash = new Audio();
var coinNoise = new Audio();

planeNoise.src = "sounds/plane.mp3";
crash.src = "sounds/crash.mp3";
coinNoise.src = "sounds/coin.wav";

//GAME VARIABLES!-----------------------------------------------------

//is the player flying?  initially set to null so the player doesnt fall
var isFlying;

//the X and Y positions of the player
var pX = 80;
var pY = 150;

//how quickly the player falls to the ground
var gravity = 8;

//the initial position of our background image and fg image and rock image
var bgX = 0;
var fgX = 0;
var rX = 0;
var rockRand;
var rockType;

//how quickly the bg and fg scroll, must be divisible by cvs.width
var bgScrollSpeed = 4;
var fgScrollSpeed = 10;
var rockScrollSpeed = 10;

//array to hold all of the rocks!
var rocks = [];

//every rock has an x, y and z component.  X and Y are positions, and Z is
//a random number which determnies whether or not the rock spawns at the top
//or the bottom of the screen
rocks[0] = {
  x: cvs.width,
  y: 0,
  z: 1,
  w: 1
};

//a constant that is added or removed to the rock collision calculations
//to improve rock collisions
var rockCollider = 67;

var score = 0;

var gameOver = false;
var gameStarted = false;

//HIGHSCORING------------
var localStorageName = 5761238243543975612987360;
var highScore;

//PARTICLE VARIABLES!!!
var flakes = 30;
var flakeArray = [];

var smoke = 50;
var smokeArray = [];



//populate the particle arrays with new particles
for (var i = 0; i < flakes; i++) {
  flakeArray.push(new createFlake);
}

for (var i = 0; i < smoke; i++) {
  smokeArray.push(new createSmoke);
}

function createFlake()
{
  this.pos = new Victor(Math.round(Math.random()*cvs.width), Math.round(Math.random()*cvs.height));
  this.s = Math.round(Math.random()*10+10);
  this.vy = new Victor(Math.round(Math.random()*20 + 12), Math.round(Math.random()-0.5 * 2));
}

//calculate the velocity of each smoke particles using simple vector maths
function createSmoke()
{
  this.pos = new Victor(pX, pY+player.height/2);
  this.s = Math.round(Math.random()*20 + 8);

  this.randPoint = new Victor(0, pY + Math.random()*40 - 20);
  this.vy = new Victor(this.randPoint.x - this.pos.x, this.randPoint.y - this.pos.y);
  this.vy.normalize();
  this.vy.multiplyScalar(Math.random() * 5 + 5);
}
//draw the particles to the screen!  If they reach the edge of the screen, send them back to the start
function DrawFlake()
{
  for (var i = 0; i < flakeArray.length; i++) {
    var f = flakeArray[i];

    ctx.drawImage(flakeImage, f.pos.x, f.pos.y, f.s, f.s);

    f.pos.subtractX(f.vy);

    if(f.pos.x < -flakeImage.width)
    {
      f.pos = Victor(cvs.width + flakeImage.width, f.pos.y);
      f.vy = new Victor(Math.round(Math.random()*20 + 10), Math.round(Math.random()-0.5 * 2));
    }
  }
}

function DrawSmoke()
{
  for (var i = 0; i < smokeArray.length; i++) {
    var s = smokeArray[i];

    ctx.drawImage(smokeImage, s.pos.x, s.pos.y, s.s, s.s);

    s.pos.x += s.vy.x;
    s.pos.y += s.vy.y;

    if(s.pos.x < -30)
    {
      s.pos = Victor(pX, pY+player.height/2);
      s.randPoint = Victor(0, pY + Math.round(Math.random()*40 - 20));
    }
  }
}

//collectable coin!
var coin = new createCoin();

//function for the coin collectable. Includes simple collision detection with the player
function createCoin()
{
  this.x = cvs.width + coinImage.width;
  this.y = Math.round(Math.random()*300 + 100);
  this.vy = Math.round(Math.random()*0+10);
}

function DrawCoin()
{
  ctx.drawImage(coinImage, coin.x, coin.y);

  coin.x -= coin.vy;

  if(coin.x < -coinImage.width)
  {
    coin.x = cvs.width + coinImage.width;
    coin.y = Math.round(Math.random()*300 + 100);
    coin.vy = Math.round(Math.random()*0+10);
  }

  if(coin.x < pX + player.width && coin.y < pY + player.height && coin.x + coinImage.width > pX && coin.y + coinImage.height > pY)
  {
    coinNoise.play();
    coin.x += cvs.width;
    score+=5;
  }
}


//when pressing a key
document.addEventListener("keydown", fly);
document.addEventListener("keyup", stopFly);

function fly() {
  isFlying = true;
  if(gameOver)
  {
    gameOver = false;
    location.reload();
  }
  if(gameStarted == false)
  {
    gameStarted = true;
    planeNoise.play();
    loop();
  }
}

function stopFly() {
  isFlying = false;
}

/*
this function cycles through every rock in the array and draws it to the canvas
based on its three parameters.  If the rock reaches a certain point on the screen
then another rock is added to the array, and the cycle continues.
*/
function DrawRocks() {
  for (var i = 0; i < rocks.length; i++) {
    if(rocks[i].z >= 0.5)
    {
		if(rocks[i].w <= 0.3)
		{
			ctx.drawImage(rockDown, rocks[i].x, rocks[i].y);
		} else if (0.7 > rocks[i].w > 0.3 )
		{
			ctx.drawImage(grassRockDown, rocks[i].x, rocks[i].y);
		} else {
			ctx.drawImage(snowRockDown, rocks[i].x, rocks[i].y);
		}

    }
    else
    {
      ctx.drawImage(grassRockUp, rocks[i].x, rocks[i].y);
    }
    rocks[i].x -= rockScrollSpeed;

    if(rocks[i].x == 600)
    {
      rockRand = Math.random();  //random value used to decide where the rock spawns
	    rockType = Math.random();
      var rockY;

      if(rockRand >= 0.5)
      {
        rockY = 0 - rockRand * 50;
      }
      else {
        rockY = cvs.height - rockUp.height + rockRand * 50;
      }

      rocks.push({
        x: cvs.width,
        y: rockY,
        z: rockRand,
		w: rockType
      });
    }

    //collision detection with rocks!!!
    if (rocks[i].z >= 0.5) //then the rock is at the top of the screen
    {
      if(pX + player.width >= rocks[i].x + rockCollider && pX <= rocks[i].x + rockDown.width - rockCollider && pY + 5 <= rocks[i].y + rockDown.height)
      {
        gameOver = true;
      }
    } else if(rocks[i].z < 0.5) { //rocks at the bottom of the screen
      if(pX + player.width >= rocks[i].x + rockCollider && pX <= rocks[i].x + rockUp.width - rockCollider && pY + player.height -5 >= rocks[i].y)
      {
        gameOver = true;
      }
    }

    //increment the score when a rock passes the player
    if(rocks[i].x == 10)
    {
      score++;
    }
  }
}

function DrawBackground()
{
  //draw the 1st background image
  ctx.drawImage(background, bgX, 0);

  //draw the 2nd background image
  ctx.drawImage(background, bgX + cvs.width, 0);

  //move the background and foreground
  bgX -= bgScrollSpeed;

  //reset the background and foreground if they reach the end of the canvas
  if(bgX == -cvs.width)
    bgX = 0;

}

function DrawForeground()
{
    //draw the 1st foreground
    ctx.drawImage(foreground, fgX, cvs.height - foreground.height);

    //draw the 2nd foreground
    ctx.drawImage(foreground, fgX + cvs.width, cvs.height - foreground.height);

    fgX -= fgScrollSpeed;

    if(fgX == -cvs.width)
      fgX = 0;
}

function DrawPlayer()
{
  ctx.drawImage(player, pX, pY);

  //increment the player's Y coordinate by gravity to make them fall
  if(isFlying == false)
    pY += gravity;

  if(isFlying)
   pY -= gravity;
}

function DrawScore()
{
  ctx.fillStyle = "#000";
  ctx.font = "30px Verdana";
  ctx.fillText("Score: "+score, 10, 25);
}

//you only want to call this function when the player is playing the game!
function loop() {

  DrawBackground();
  DrawPlayer();
  DrawRocks();
  DrawForeground();
  DrawScore();
  DrawFlake();
  DrawSmoke();
  DrawCoin();

  //end the game if the player flies off the canvas
  if(pY + player.height >= cvs.height - foreground.height + 50 || pY <= -10)
  {
    gameOver = true;
  }

  //loop the plane AUDIO
  if(planeNoise.ended == true)
  {
    planeNoise.play();
  }

  //only request animation frame if the game is not over and the game has started
  if(gameOver == false && gameStarted == true)
  {
    requestAnimationFrame(loop);
  }
  else if(gameOver == true) {
    GameIsOver();
  } else {
    StartScreen();
  }
}

function GameIsOver()
{
	highScore = Math.max(score, highScore);
	localStorage.setItem(localStorageName, highScore);

  planeNoise.pause();
  crash.play();

  ctx.drawImage(gameOverImg, 0, 0);

  ctx.fillStyle = "#000";
  ctx.font = "60px Roboto";
  ctx.fillText("Final Score: "+score, 200, 225);

  ctx.font = "40px Roboto";
  ctx.fillText("High Score: "+highScore, 200, 300);

  ctx.font = "30px Roboto";
  ctx.fillText("Press any key to restart!", 200, 375);
}

function StartScreen()
{
  ctx.drawImage(gameOverImg, 0, 0);

  ctx.fillStyle = "#000";
  ctx.font = "60px Roboto";
  ctx.fillText("Tap to fly!", 200, 225);

  ctx.font = "30px Roboto";
  ctx.fillText("Hold to keep flying!", 200, 295);
}

function CheckHighScore()
{
	if(localStorage.getItem(localStorageName) == null) {
		highScore = 0;
	} else {
		highScore = localStorage.getItem(localStorageName);
	}
}


window.onload = function ()
{
  CheckHighScore();
  loop();
}
