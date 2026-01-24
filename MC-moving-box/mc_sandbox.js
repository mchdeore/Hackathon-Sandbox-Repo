const canvas = document.getElementById("game_canvas");
const start_btn = document.getElementById("start_btn");
const blockCounter = document.getElementById("blockCounter");
const rulesBtn = document.getElementById("rules_btn");
const howToPlay = document.getElementById("howToPlay");

const {
  Engine,
  Render,
  Runner,
  Bodies,
  Composite,
  Body,
  Events
} = Matter;

let engine;
let runner;
let render;
let player;
let goal;
let cursor;
let cursorCol = 0;
let cursorRow = 0;
let canJump = false;
let groundContacts = 0;
let placedBlocks = 0;
let placedBlockBodies = [];
let occupiedCells = new Set();
let blockTimers = new Map();
let blockKeyMap = new Map();

const maxBlocks = 3;
const blockSize = { w: 80, h: 20 };
const gridSize = { x: 80, y: 20 };
let gridCols = 0;
let gridRows = 0;
let isShiftDown = false;

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }

  if (e.key === "Shift") {
    isShiftDown = true;
  }

  if (e.key === "ArrowUp" && canJump && player) {
    Body.applyForce(player, player.position, { x: 0, y: -0.06 });
    canJump = false;
  }

  if (["w", "a", "s", "d", " "].includes(key)) {
    e.preventDefault();
  }

  const step = e.shiftKey ? 2 : 1;
  if (key === "w") moveCursor(0, -step);
  if (key === "s") moveCursor(0, step);
  if (key === "a") moveCursor(-step, 0);
  if (key === "d") moveCursor(step, 0);
  if (key === " ") placeBlockAtCursor();
});

window.addEventListener("keyup", (e) => {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }

  if (e.key === "Shift") {
    isShiftDown = false;
  }
});

start_btn.addEventListener("click", () => {
  document.getElementById("rulesScreen").hidden = true;
  document.getElementById("gameScreen").hidden = false;
  start_btn.style.display = "none";
  initPhysics();
}, { once: true });

rulesBtn.addEventListener("click", () => {
  howToPlay.hidden = !howToPlay.hidden;
});

function initPhysics() {
  if (engine) return;
  const width = canvas.width;
  const height = canvas.height;
  const wallThickness = 50;

  engine = Engine.create();
  engine.gravity.y = 1;
  gridCols = Math.floor(width / gridSize.x);
  gridRows = Math.floor(height / gridSize.y);

  render = Render.create({
    canvas,
    engine,
    options: {
      width,
      height,
      wireframes: false,
      background: "transparent"
    }
  });

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  setupWorld();

  Events.on(engine, "beforeUpdate", () => {
    const force = 0.002;
    if (keys.ArrowLeft) Body.applyForce(player, player.position, { x: -force, y: 0 });
    if (keys.ArrowRight) Body.applyForce(player, player.position, { x: force, y: 0 });
    if (keys.ArrowDown) Body.applyForce(player, player.position, { x: 0, y: force });

    const maxSpeed = 7;
    const vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocity.x));
    const vy = Math.max(-maxSpeed, Math.min(maxSpeed, player.velocity.y));
    Body.setVelocity(player, { x: vx, y: vy });
  });

  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const other = pair.bodyA === player ? pair.bodyB : pair.bodyA === player ? pair.bodyB : null;
      if (!other) continue;

      if (other.isSensor && other.label === "goal") {
        handleObjectiveComplete();
        continue;
      }

      if (other.isStatic) {
        groundContacts += 1;
        canJump = groundContacts > 0;
      }
    }
  });

  Events.on(engine, "collisionEnd", (event) => {
    for (const pair of event.pairs) {
      const other = pair.bodyA === player ? pair.bodyB : pair.bodyA === player ? pair.bodyB : null;
      if (!other) continue;
      if (other.isStatic) {
        groundContacts = Math.max(0, groundContacts - 1);
        canJump = groundContacts > 0;
      }
    }
  });
}

function setupWorld() {
  groundContacts = 0;
  canJump = false;
  placedBlocks = 0;
  placedBlockBodies = [];
  occupiedCells.clear();
  blockTimers.clear();
  blockKeyMap.clear();

  Composite.clear(engine.world, false);

  const width = canvas.width;
  const height = canvas.height;
  const wallThickness = 50;

  player = Bodies.rectangle(100, 50, 50, 50, {
    restitution: 0.2,
    friction: 0.1,
    label: "player"
  });

  cursorCol = Math.floor(gridCols / 2);
  cursorRow = Math.floor(gridRows / 2);
  const cursorPosition = gridToWorld(cursorCol, cursorRow);
  cursor = Bodies.rectangle(cursorPosition.x, cursorPosition.y, blockSize.w, blockSize.h, {
    isStatic: true,
    isSensor: true,
    label: "cursor",
    render: { fillStyle: "#d7263d", opacity: 0.35 }
  });

  const walls = [
    Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, label: "ground" }),
    Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, label: "ceiling" }),
    Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, label: "leftWall" }),
    Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, label: "rightWall" })
  ];

  const goalPosition = randomGoalPosition();
  goal = Bodies.rectangle(goalPosition.x, goalPosition.y, 40, 40, {
    isStatic: true,
    isSensor: true,
    label: "goal",
    render: { fillStyle: "#2ecc71" }
  });

  Composite.add(engine.world, [player, goal, cursor, ...walls]);
  updateBlockCounter();
}

function randomGoalPosition() {
  const margin = 60;
  return {
    x: Math.floor(margin + Math.random() * (canvas.width - margin * 2)),
    y: Math.floor(margin + Math.random() * (canvas.height - margin * 2))
  };
}

function moveGoal() {
  if (!goal) return;
  const next = randomGoalPosition();
  Body.setPosition(goal, next);
  Body.setVelocity(goal, { x: 0, y: 0 });
  Body.setAngle(goal, 0);
}

function gridToWorld(col, row) {
  const offsetX = blockSize.w / 2;
  const offsetY = blockSize.h / 2;
  return {
    x: col * gridSize.x + offsetX,
    y: row * gridSize.y + offsetY
  };
}

function handleObjectiveComplete() {
  moveGoal();
  resetPlacedBlocks();
  updateBlockCounter();
}

function resetPlacedBlocks() {
  const blocks = placedBlockBodies.slice();
  for (const block of blocks) {
    removePlacedBlock(block);
  }
}

function updateBlockCounter() {
  if (!blockCounter) return;
  const stock = Math.max(0, maxBlocks - placedBlocks);
  blockCounter.textContent = `Blocks: ${placedBlocks}/${maxBlocks}`;
}

function addPlacedBlock(block, key) {
  placedBlocks += 1;
  placedBlockBodies.push(block);
  occupiedCells.add(key);
  blockKeyMap.set(block, key);
  updateBlockCounter();

  const timer = setTimeout(() => {
    removePlacedBlock(block);
  }, 3000);
  blockTimers.set(block, timer);
}

function removePlacedBlock(block) {
  if (!blockKeyMap.has(block)) return;
  Composite.remove(engine.world, block);
  placedBlocks = Math.max(0, placedBlocks - 1);

  const key = blockKeyMap.get(block);
  if (key) occupiedCells.delete(key);
  blockKeyMap.delete(block);

  const timer = blockTimers.get(block);
  if (timer) {
    clearTimeout(timer);
    blockTimers.delete(block);
  }

  placedBlockBodies = placedBlockBodies.filter((body) => body !== block);
  updateBlockCounter();
}

function moveCursor(deltaCol, deltaRow) {
  if (!cursor) return;
  cursorCol = Math.max(0, Math.min(gridCols - 1, cursorCol + deltaCol));
  cursorRow = Math.max(0, Math.min(gridRows - 1, cursorRow + deltaRow));
  const position = gridToWorld(cursorCol, cursorRow);
  Body.setPosition(cursor, position);
}

function placeBlockAtCursor() {
  if (!engine || placedBlocks >= maxBlocks) return;
  const key = `${cursorCol},${cursorRow}`;
  if (occupiedCells.has(key)) return;
  const position = gridToWorld(cursorCol, cursorRow);

  const block = Bodies.rectangle(position.x, position.y, blockSize.w, blockSize.h, {
    isStatic: true,
    label: "placedBlock",
    render: { fillStyle: "#555555" }
  });

  Composite.add(engine.world, block);
  addPlacedBlock(block, key);
}
