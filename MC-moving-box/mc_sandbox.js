const canvas = document.getElementById("game_canvas");
const ctx = canvas.getContext("2d");
const start_btn = document.getElementById("start_btn");

let game_running = false;
let animation_id;

// start btn event listener
start_btn.addEventListener("click", () => {
  document.getElementById("rulesScreen").hidden = true;
  document.getElementById("gameScreen").hidden = false;
  start_btn.style.display = "none";
  game_running = true;
  gameLoop();
}
);

// game refresh loop 
function gameLoop() {
    if (!game_running) return;
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// arrow key detection
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener("keydown", (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
        e.preventDefault();
    }
});

window.addEventListener("keyup", (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
        e.preventDefault();
    }
});

// update on arrow key press
const speed = 4;

function update() {
    if (keys.ArrowUp)    player_y -= speed;
    if (keys.ArrowDown)  player_y += speed;
    if (keys.ArrowLeft)  player_x -= speed;
    if (keys.ArrowRight) player_x += speed;
}



// visual rendering and sprite controll
let player_x = 0;
let player_y = 0;
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(player_x, player_y, 50, 50);
    
}