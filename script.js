// Game Configuration and State
const CONFIG = {
  gridSize: 24, // 24x24 grid
  cellSize: 25, // 25px per cell = 600px canvas
  baseSpeed: 100, // ms per tick
  comboTimeout: 3500, // time in ms to keep combo alive
};

// Theme Definitions matching style.css
const THEMES = {
  cyberpunk: {
    primary: '#00f0ff',
    secondary: '#ff007f',
    accent: '#ffe600',
    grid: 'rgba(0, 240, 255, 0.05)',
    headGlow: '#00f0ff',
    bodyGlow: 'rgba(0, 240, 255, 0.3)',
    foodColor: '#ff007f',
    foodGlow: '#ff007f',
    superFoodColor: '#ffe600',
    superFoodGlow: '#ffe600'
  },
  sunset: {
    primary: '#ff007f',
    secondary: '#ffaa00',
    accent: '#00f0ff',
    grid: 'rgba(255, 0, 127, 0.05)',
    headGlow: '#ff007f',
    bodyGlow: 'rgba(255, 0, 127, 0.3)',
    foodColor: '#ffaa00',
    foodGlow: '#ffaa00',
    superFoodColor: '#00f0ff',
    superFoodGlow: '#00f0ff'
  },
  matrix: {
    primary: '#39ff14',
    secondary: '#008f11',
    accent: '#ffffff',
    grid: 'rgba(57, 255, 20, 0.06)',
    headGlow: '#39ff14',
    bodyGlow: 'rgba(57, 255, 20, 0.3)',
    foodColor: '#39ff14',
    foodGlow: '#39ff14',
    superFoodColor: '#ffffff',
    superFoodGlow: '#ffffff'
  }
};

let state = {
  snake: [],
  direction: 'right',
  nextDirection: 'right',
  directionQueue: [],
  food: { x: 0, y: 0, isSuper: false },
  score: 0,
  highScore: 0,
  combo: 1,
  maxCombo: 1,
  comboTimer: null,
  comboEndTime: 0,
  gameInterval: null,
  speed: CONFIG.baseSpeed,
  difficulty: 'medium',
  activeTheme: 'cyberpunk',
  isPlaying: false,
  isPaused: false,
  isAudioMuted: false,
  particles: []
};

// Web Audio API context placeholder
let audioCtx = null;

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const highScoreEl = document.getElementById('highScore');
const comboContainer = document.getElementById('comboContainer');
const comboValueEl = document.getElementById('comboValue');
const finalScoreEl = document.getElementById('finalScore');
const maxComboEl = document.getElementById('maxCombo');
const newHighScoreRow = document.getElementById('newHighScoreRow');

// Screens
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseScreen = document.getElementById('pauseScreen');

// Buttons & Controls
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resumeBtn = document.getElementById('resumeBtn');
const menuBtn = document.getElementById('menuBtn');
const audioToggle = document.getElementById('audioToggle');
const diffButtons = document.querySelectorAll('.diff-btn');
const themeButtons = document.querySelectorAll('.theme-btn');

// Mobile Controllers
const mobileDpad = document.getElementById('mobileDpad');
const padUp = document.getElementById('padUp');
const padDown = document.getElementById('padDown');
const padLeft = document.getElementById('padLeft');
const padRight = document.getElementById('padRight');
const padPause = document.getElementById('padPause');

// Initialize Game
function init() {
  loadHighScore();
  setupEventListeners();
  setupThemes();
  setupDifficulty();
  setupTouchControls();
  
  // Animation frames for custom drawings (e.g. food breathing, particles)
  requestAnimationFrame(drawLoop);
}

// Local Storage for High Score & Mute State
function loadHighScore() {
  const savedScore = localStorage.getItem('snake_highScore');
  if (savedScore) {
    state.highScore = parseInt(savedScore, 10);
    highScoreEl.textContent = formatScore(state.highScore);
  }
  
  const savedMute = localStorage.getItem('snake_audioMuted');
  if (savedMute === 'true') {
    state.isAudioMuted = true;
    audioToggle.classList.add('muted');
  }
}

function saveHighScore() {
  localStorage.setItem('snake_highScore', state.highScore);
}

function formatScore(score) {
  return String(score).padStart(3, '0');
}

// Audio Synthesis Engine using Web Audio API
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (state.isAudioMuted) return;
  initAudio();
  if (!audioCtx) return;

  // Resume context if suspended (browser security autoplays check)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  switch (type) {
    case 'eat': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      // Fast pitch slide up
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.16);
      break;
    }
    case 'superEat': {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(300, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.31);
      osc2.stop(now + 0.31);
      break;
    }
    case 'crash': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.6);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.6);

      osc.start(now);
      osc.stop(now + 0.61);
      break;
    }
    case 'turn': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(150, now + 0.03);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.06);
      break;
    }
    case 'milestone': {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major arpeggio
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.16);
      });
      break;
    }
  }
}

// Particle System
class Particle {
  constructor(x, y, color) {
    this.x = x + CONFIG.cellSize / 2;
    this.y = y + CONFIG.cellSize / 2;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.5) * 6;
    this.radius = Math.random() * 3 + 2;
    this.alpha = 1;
    this.color = color;
    this.decay = Math.random() * 0.03 + 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}

function spawnExplosion(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    state.particles.push(new Particle(x, y, color));
  }
}

// Start Game
function startGame() {
  initAudio();
  
  // Reset states
  state.snake = [
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 }
  ];
  state.direction = 'right';
  state.nextDirection = 'right';
  state.directionQueue = [];
  state.score = 0;
  state.combo = 1;
  state.maxCombo = 1;
  
  currentScoreEl.textContent = formatScore(state.score);
  comboContainer.classList.remove('active');
  newHighScoreRow.style.display = 'none';

  spawnFood();
  
  state.isPlaying = true;
  state.isPaused = false;
  
  // Hide active overlays
  startScreen.classList.remove('active');
  gameOverScreen.classList.remove('active');
  pauseScreen.classList.remove('active');

  // Set Speed based on difficulty
  adjustSpeedSetting();

  // Reset Game Loop Interval
  if (state.gameInterval) clearInterval(state.gameInterval);
  state.gameInterval = setInterval(gameTick, state.speed);

  playSound('milestone');
}

function adjustSpeedSetting() {
  const diffBtn = document.querySelector('.diff-btn.active');
  if (diffBtn) {
    state.speed = parseInt(diffBtn.dataset.speed, 10);
  }
}

function pauseGame() {
  if (!state.isPlaying || state.isPaused) return;
  state.isPaused = true;
  pauseScreen.classList.add('active');
  clearInterval(state.gameInterval);
}

function resumeGame() {
  if (!state.isPlaying || !state.isPaused) return;
  state.isPaused = false;
  pauseScreen.classList.remove('active');
  state.gameInterval = setInterval(gameTick, state.speed);
}

// Spawn food in empty space
function spawnFood() {
  let isOccupied = true;
  let foodX, foodY;

  while (isOccupied) {
    foodX = Math.floor(Math.random() * CONFIG.gridSize);
    foodY = Math.floor(Math.random() * CONFIG.gridSize);
    
    // Check if food coordinates land on the snake
    isOccupied = state.snake.some(segment => segment.x === foodX && segment.y === foodY);
  }

  // 15% chance to spawn a Super Food
  const isSuper = Math.random() < 0.15;

  state.food = {
    x: foodX,
    y: foodY,
    isSuper: isSuper
  };
}

// Main Game Loop Update Tick
function gameTick() {
  // Apply queued directions
  if (state.directionQueue.length > 0) {
    const nextDir = state.directionQueue.shift();
    if (
      (nextDir === 'up' && state.direction !== 'down') ||
      (nextDir === 'down' && state.direction !== 'up') ||
      (nextDir === 'left' && state.direction !== 'right') ||
      (nextDir === 'right' && state.direction !== 'left')
    ) {
      if (state.direction !== nextDir) {
        playSound('turn');
      }
      state.direction = nextDir;
    }
  }

  // Calculate new head position
  const head = { ...state.snake[0] };
  switch (state.direction) {
    case 'up': head.y -= 1; break;
    case 'down': head.y += 1; break;
    case 'left': head.x -= 1; break;
    case 'right': head.x += 1; break;
  }

  // Check collision with wall boundaries
  if (
    head.x < 0 || 
    head.x >= CONFIG.gridSize || 
    head.y < 0 || 
    head.y >= CONFIG.gridSize
  ) {
    endGame();
    return;
  }

  // Check collision with itself
  const selfCollision = state.snake.some((segment, idx) => {
    // Avoid head itself (idx 0 is head position, which has not been added yet)
    return segment.x === head.x && segment.y === head.y;
  });

  if (selfCollision) {
    endGame();
    return;
  }

  // Move snake by adding head to the front
  state.snake.unshift(head);

  // Check if snake eats food
  if (head.x === state.food.x && head.y === state.food.y) {
    handleEatFood();
  } else {
    // Remove tail segment if it didn't eat
    state.snake.pop();
  }

  // Check if combo timer has expired
  if (state.combo > 1 && Date.now() > state.comboEndTime) {
    state.combo = 1;
    comboContainer.classList.remove('active');
  }
}

function handleEatFood() {
  const currentTheme = THEMES[state.activeTheme];
  const foodColor = state.food.isSuper ? currentTheme.superFoodColor : currentTheme.foodColor;
  
  // Spark explosion effect at food coordinates
  spawnExplosion(state.food.x * CONFIG.cellSize, state.food.y * CONFIG.cellSize, foodColor, state.food.isSuper ? 18 : 10);
  
  // Calculate combo multiplier
  const now = Date.now();
  if (now <= state.comboEndTime) {
    state.combo = Math.min(state.combo + 1, 5); // Max x5 combo
  } else {
    state.combo = 1;
  }
  
  state.comboEndTime = now + CONFIG.comboTimeout;
  if (state.combo > state.maxCombo) {
    state.maxCombo = state.combo;
  }

  // Update combo UI
  if (state.combo > 1) {
    comboValueEl.textContent = `x${state.combo}`;
    comboContainer.classList.add('active');
  }

  // Play audio sound
  if (state.food.isSuper) {
    playSound('superEat');
    state.score += 30 * state.combo;
  } else {
    playSound('eat');
    state.score += 10 * state.combo;
  }

  currentScoreEl.textContent = formatScore(state.score);
  
  // Dynamically increase speed slightly on hard difficulty
  if (state.difficulty === 'hard') {
    state.speed = Math.max(50 - Math.floor(state.score / 200) * 3, 30);
    clearInterval(state.gameInterval);
    state.gameInterval = setInterval(gameTick, state.speed);
  }

  spawnFood();
}

function endGame() {
  playSound('crash');
  clearInterval(state.gameInterval);
  state.isPlaying = false;

  // Trigger screen shake effect on game wrapper
  const wrapper = document.querySelector('.canvas-wrapper');
  wrapper.style.animation = 'none';
  wrapper.offsetHeight; // Trigger reflow
  wrapper.style.animation = 'shake 0.4s ease';

  // Spawn explosion at snake's head
  const headPos = state.snake[0];
  const currentTheme = THEMES[state.activeTheme];
  if (headPos) {
    spawnExplosion(headPos.x * CONFIG.cellSize, headPos.y * CONFIG.cellSize, currentTheme.secondary, 25);
  }

  // Update Scoreboards
  finalScoreEl.textContent = state.score;
  maxComboEl.textContent = `x${state.maxCombo}`;

  if (state.score > state.highScore) {
    state.highScore = state.score;
    highScoreEl.textContent = formatScore(state.highScore);
    saveHighScore();
    newHighScoreRow.style.display = 'flex';
  }

  gameOverScreen.classList.add('active');
}

// Drawing Loop (Runs at 60fps for smooth visual FX)
let foodPulseAngle = 0;

function drawLoop() {
  requestAnimationFrame(drawLoop);

  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const theme = THEMES[state.activeTheme];

  // Draw Grid Lines (Subtle background)
  drawGrid(theme);

  // Update & Draw Particles
  state.particles.forEach((particle, idx) => {
    particle.update();
    if (particle.alpha <= 0) {
      state.particles.splice(idx, 1);
    } else {
      particle.draw(ctx);
    }
  });

  // Draw Food if game is active
  if (state.isPlaying) {
    drawFood(theme);
  }

  // Draw Snake
  if (state.snake.length > 0) {
    drawSnake(theme);
  }
}

function drawGrid(theme) {
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;

  for (let i = 0; i <= CONFIG.gridSize; i++) {
    // Vertical
    ctx.beginPath();
    ctx.moveTo(i * CONFIG.cellSize, 0);
    ctx.lineTo(i * CONFIG.cellSize, canvas.height);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, i * CONFIG.cellSize);
    ctx.lineTo(canvas.width, i * CONFIG.cellSize);
    ctx.stroke();
  }
}

function drawFood(theme) {
  const foodX = state.food.x * CONFIG.cellSize;
  const foodY = state.food.y * CONFIG.cellSize;
  const halfCell = CONFIG.cellSize / 2;

  // Pulse animation calculations
  foodPulseAngle += 0.08;
  const pulseScale = Math.sin(foodPulseAngle) * 2 + 1; // pulsates by -1px to +3px
  const radius = (state.food.isSuper ? 8 : 6) + pulseScale;
  const foodColor = state.food.isSuper ? theme.superFoodColor : theme.foodColor;

  ctx.save();
  ctx.beginPath();
  ctx.arc(foodX + halfCell, foodY + halfCell, radius, 0, Math.PI * 2);
  
  // Inner Glow/Shadow
  ctx.shadowColor = foodColor;
  ctx.shadowBlur = state.food.isSuper ? 16 + Math.sin(foodPulseAngle)*4 : 10;
  ctx.fillStyle = foodColor;
  ctx.fill();

  // Draw an extra energy ring for Super food
  if (state.food.isSuper) {
    ctx.beginPath();
    ctx.arc(foodX + halfCell, foodY + halfCell, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5 + Math.sin(foodPulseAngle) * 0.2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawSnake(theme) {
  ctx.save();

  // Draw Body Segments (Back to front, except head)
  for (let i = state.snake.length - 1; i > 0; i--) {
    const segment = state.snake[i];
    const prevSegment = state.snake[i - 1];
    
    const x = segment.x * CONFIG.cellSize;
    const y = segment.y * CONFIG.cellSize;
    const halfCell = CONFIG.cellSize / 2;

    // Body segment grows smaller towards the tail (organic feel)
    const t = i / state.snake.length; // 0 (head side) to 1 (tail side)
    const baseRadius = 10;
    const radius = Math.max(baseRadius * (1 - t * 0.4), 5); // Taper tail to 60% of size

    ctx.beginPath();
    ctx.arc(x + halfCell, y + halfCell, radius, 0, Math.PI * 2);

    // Apply color gradient from Head (Primary) to Tail (Secondary)
    const colorRatio = i / state.snake.length;
    ctx.fillStyle = interpolateColor(theme.primary, theme.secondary, colorRatio);
    ctx.shadowColor = theme.bodyGlow;
    ctx.shadowBlur = 6;
    ctx.fill();
    
    // Connect segments visually so they look like a continuous snake body
    if (prevSegment) {
      const nextX = prevSegment.x * CONFIG.cellSize;
      const nextY = prevSegment.y * CONFIG.cellSize;

      ctx.beginPath();
      ctx.moveTo(x + halfCell, y + halfCell);
      ctx.lineTo(nextX + halfCell, nextY + halfCell);
      ctx.strokeStyle = interpolateColor(theme.primary, theme.secondary, colorRatio);
      ctx.lineWidth = radius * 1.6; // Slightly less than double radius for visual overlaps
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  // Draw Head (Segment 0)
  const head = state.snake[0];
  const headX = head.x * CONFIG.cellSize;
  const headY = head.y * CONFIG.cellSize;
  const halfCell = CONFIG.cellSize / 2;
  const headRadius = 11;

  ctx.beginPath();
  ctx.arc(headX + halfCell, headY + halfCell, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = theme.primary;
  ctx.shadowColor = theme.headGlow;
  ctx.shadowBlur = 15;
  ctx.fill();

  // Draw Snake Eyes (Looking in direction of movement)
  ctx.shadowBlur = 0; // Turn off glow for eyes to look sharp
  ctx.fillStyle = '#000000';
  
  let eyeOffsetLeft = { dx: 0, dy: 0 };
  let eyeOffsetRight = { dx: 0, dy: 0 };

  switch (state.direction) {
    case 'right':
      eyeOffsetLeft = { dx: 4, dy: -4 };
      eyeOffsetRight = { dx: 4, dy: 4 };
      break;
    case 'left':
      eyeOffsetLeft = { dx: -4, dy: 4 };
      eyeOffsetRight = { dx: -4, dy: -4 };
      break;
    case 'up':
      eyeOffsetLeft = { dx: -4, dy: -4 };
      eyeOffsetRight = { dx: 4, dy: -4 };
      break;
    case 'down':
      eyeOffsetLeft = { dx: 4, dy: 4 };
      eyeOffsetRight = { dx: -4, dy: 4 };
      break;
  }

  // Eye 1
  ctx.beginPath();
  ctx.arc(headX + halfCell + eyeOffsetLeft.dx, headY + halfCell + eyeOffsetLeft.dy, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Eye 2
  ctx.beginPath();
  ctx.arc(headX + halfCell + eyeOffsetRight.dx, headY + halfCell + eyeOffsetRight.dy, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Draw pupils (small glowing dots inside eyes)
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(headX + halfCell + eyeOffsetLeft.dx + (state.direction === 'right' ? 0.5 : state.direction === 'left' ? -0.5 : 0), headY + halfCell + eyeOffsetLeft.dy + (state.direction === 'down' ? 0.5 : state.direction === 'up' ? -0.5 : 0), 0.8, 0, Math.PI * 2);
  ctx.arc(headX + halfCell + eyeOffsetRight.dx + (state.direction === 'right' ? 0.5 : state.direction === 'left' ? -0.5 : 0), headY + halfCell + eyeOffsetRight.dy + (state.direction === 'down' ? 0.5 : state.direction === 'up' ? -0.5 : 0), 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Helper: Hex Color Interpolation for body gradient
function interpolateColor(color1, color2, factor) {
  // Simple check for Hex colors
  const c1 = parseHex(color1);
  const c2 = parseHex(color2);

  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));

  return `rgb(${r}, ${g}, ${b})`;
}

function parseHex(hex) {
  // Normalize short hex code (e.g. #03f -> #0033ff)
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Event Listeners (Keyboard and Core Buttons)
function setupEventListeners() {
  // Keypress input handler
  window.addEventListener('keydown', handleKeyDown);

  // Screen Overlay Buttons
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  resumeBtn.addEventListener('click', resumeGame);
  menuBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
  });

  // Sound Toggle Mute
  audioToggle.addEventListener('click', () => {
    state.isAudioMuted = !state.isAudioMuted;
    localStorage.setItem('snake_audioMuted', state.isAudioMuted);
    
    if (state.isAudioMuted) {
      audioToggle.classList.add('muted');
    } else {
      audioToggle.classList.remove('muted');
      initAudio();
    }
  });

  // Canvas container clicking for pausing on desktops
  canvas.addEventListener('click', () => {
    if (state.isPlaying) {
      if (state.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  });
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  
  // Prevent scrolling
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
    e.preventDefault();
  }

  // Handle Pause (Spacebar)
  if (e.key === ' ' || e.key === 'Spacebar') {
    if (state.isPlaying) {
      if (state.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
    return;
  }

  let dir = null;
  if (key === 'arrowup' || key === 'w') dir = 'up';
  if (key === 'arrowdown' || key === 's') dir = 'down';
  if (key === 'arrowleft' || key === 'a') dir = 'left';
  if (key === 'arrowright' || key === 'd') dir = 'right';

  if (dir && state.isPlaying && !state.isPaused) {
    queueDirection(dir);
  }
}

// Direction Queue checks (prevent rapid counter inputs crushing the snake)
function queueDirection(newDir) {
  const lastQueuedDir = state.directionQueue.length > 0 
    ? state.directionQueue[state.directionQueue.length - 1] 
    : state.direction;

  // Prevent moving back into current direction immediately
  if (newDir === 'up' && lastQueuedDir === 'down') return;
  if (newDir === 'down' && lastQueuedDir === 'up') return;
  if (newDir === 'left' && lastQueuedDir === 'right') return;
  if (newDir === 'right' && lastQueuedDir === 'left') return;

  // Max out queue length to prevent buffer lag
  if (state.directionQueue.length < 2) {
    state.directionQueue.push(newDir);
  }
}

// Difficulties Setup
function setupDifficulty() {
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.difficulty;
      adjustSpeedSetting();
    });
  });
}

// Themes Setup
function setupThemes() {
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const themeName = btn.dataset.theme;
      state.activeTheme = themeName;
      document.body.setAttribute('data-active-theme', themeName);
      
      // Update canvas elements' aesthetics on change
      const theme = THEMES[themeName];
      document.querySelector('.canvas-wrapper').style.borderColor = theme.primary;
    });
  });
}

// Touch controls setup (Mobile swipe gestures & D-Pad)
function setupTouchControls() {
  // 1. Virtual D-pad clicks
  padUp.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileDir('up'); });
  padDown.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileDir('down'); });
  padLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileDir('left'); });
  padRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobileDir('right'); });
  
  padUp.addEventListener('mousedown', () => handleMobileDir('up'));
  padDown.addEventListener('mousedown', () => handleMobileDir('down'));
  padLeft.addEventListener('mousedown', () => handleMobileDir('left'));
  padRight.addEventListener('mousedown', () => handleMobileDir('right'));

  padPause.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleMobilePause();
  });
  padPause.addEventListener('mousedown', toggleMobilePause);

  // 2. Swipe detection on canvas
  let touchStartX = 0;
  let touchStartY = 0;
  
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!state.isPlaying || state.isPaused) return;

    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const threshold = 30; // Min swipe distance in pixels

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > threshold) {
        if (dx > 0) {
          queueDirection('right');
        } else {
          queueDirection('left');
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > threshold) {
        if (dy > 0) {
          queueDirection('down');
        } else {
          queueDirection('up');
        }
      }
    }
  }, { passive: true });
}

function handleMobileDir(dir) {
  if (state.isPlaying && !state.isPaused) {
    queueDirection(dir);
  }
}

function toggleMobilePause() {
  if (state.isPlaying) {
    if (state.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }
}

// CSS Screen shake definition loaded on JavaScript execution
const styleSheet = document.createElement('style');
styleSheet.innerHTML = `
  @keyframes shake {
    0%, 100% { transform: translate(0, 0); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-6px, -4px); }
    20%, 40%, 60%, 80% { transform: translate(6px, 4px); }
  }
`;
document.head.appendChild(styleSheet);

// Run Initialization on Load
window.addEventListener('DOMContentLoaded', init);
