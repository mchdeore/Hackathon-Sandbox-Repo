const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 400;

let raf;
let running = false;
let wallHitCount= 0

const ball = {
  x: 100,
  y: 100,
  vx: 5,
  vy: 1,
  radius: 25,
  color: "blue",
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
  },
};

function clear() {
   ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  clear();
  ball.draw();
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Boundary Conditions 
  if (
    // The next position would go above the border height (top wall)
    ball.y + ball.vy > canvas.height - ball.radius ||
    // The next postion would go below the border height (bottom wall)
    ball.y + ball.vy < ball.radius
  ) {
    // Changes vertical direction of ball when it hits bottom or top wall
    ball.vy = -ball.vy;
    wallHitCount++;
  }

  // same concept but on left and right walls
  if (
    ball.x + ball.vx > canvas.width - ball.radius ||
    ball.x + ball.vx < ball.radius
  ) {
    ball.vx = -ball.vx;
     wallHitCount++;
  }

  document.getElementById("wallHitCount").textContent = wallHitCount;

  raf = window.requestAnimationFrame(draw);
}


// when mouse moves over canvas
canvas.addEventListener("mousemove", (e) => {
  // when animation isn't running (running is set at false at begining of script)
  if (!running) {

    //wipes canvas
    clear();
    
    // sets ball's position at the mouse cursor
    ball.x = e.clientX;
    ball.y = e.clientY;
    ball.draw();
  }
});

// when clicked inside canvas
canvas.addEventListener("click", (e) => {
  // this prevents multiple animation loops
  if (!running) {
    // uses draw method
    raf = window.requestAnimationFrame(draw);

    // makes animation active now
    running = true;
  }
});

// when mouse leaves canvas
canvas.addEventListener("mouseout", (e) => {
  // animation stops
  window.cancelAnimationFrame(raf);
  running = false;
});



ball.draw();