#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { commands, getTimeLimit, getRank } from './commands.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HIGH_SCORE_FILE = path.join(__dirname, '.highscore.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let currentCommand = '';
let startTime = null;
let timerInterval = null;
let timeLimit = 0;
let timeRemaining = 0;
let commandsCompleted = 0;
let totalScore = 0;
let currentLevel = 1;
let highScore = loadHighScore();
let userInput = '';

// Load high score
function loadHighScore() {
  try {
    if (fs.existsSync(HIGH_SCORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(HIGH_SCORE_FILE, 'utf8'));
      return data.highScore || 0;
    }
  } catch (e) {}
  return 0;
}

// Save high score
function saveHighScore(score) {
  try {
    fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify({ highScore: score }));
  } catch (e) {}
}

// Shuffle commands
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const shuffledCommands = shuffle(commands);

// Clear screen
function clearScreen() {
  console.clear();
  process.stdout.write('\x1b[2J\x1b[H\x1b[?25l');
}

// Get terminal dimensions
function getTerminalSize() {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  };
}

// Center text
function centerText(text, width) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

// Display confetti
function displayConfetti() {
  const { width, height } = getTerminalSize();
  const confetti = ['*', '+', '·', '•', '◆', '○'];
  const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.magenta];
  
  let output = '';
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * (height - 10)) + 3;
    const char = confetti[Math.floor(Math.random() * confetti.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    output += `\x1b[${y};${x}H${color(char)}`;
  }
  process.stdout.write(output);
}

// Display centered UI
function displayUI() {
  clearScreen();
  const { width, height } = getTerminalSize();
  const centerY = Math.floor(height / 2) - 6;
  
  let line = centerY;
  
  // Title
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.bold.cyan('ARCHTYPE'), width)}`);
  line++;
  
  // Stats
  const stats = `Level ${currentLevel}  |  Score: ${totalScore}  |  High Score: ${highScore}  |  Completed: ${commandsCompleted}/${commands.length}`;
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray(stats), width)}`);
  line += 2;
  
  // Command to type
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.white('Type this command:'), width)}`);
  line++;
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.bgBlue.white.bold(` ${currentCommand} `), width)}`);
  line += 2;
  
  // Timer bar
  const percentage = (timeRemaining / timeLimit) * 100;
  let color = chalk.green;
  if (percentage < 30) color = chalk.red;
  else if (percentage < 50) color = chalk.yellow;
  
  const barLength = Math.min(60, width - 20);
  const filled = Math.round((timeRemaining / timeLimit) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  const timeText = `${timeRemaining.toFixed(1)}s / ${timeLimit.toFixed(1)}s`;
  process.stdout.write(`\x1b[${line++};0H${centerText(color(timeText), width)}`);
  process.stdout.write(`\x1b[${line++};0H${centerText(color(bar), width)}`);
  line += 2;
  
  // User input
  const inputDisplay = userInput || '';
  const displayText = inputDisplay.length <= currentCommand.length 
    ? chalk.cyan(inputDisplay) + chalk.gray(currentCommand.slice(inputDisplay.length))
    : chalk.cyan(inputDisplay);
  process.stdout.write(`\x1b[${line};0H${centerText(displayText, width)}`);
}

// Display rank animation
async function displayRank(rankData, timeUsed) {
  return new Promise((resolve) => {
    clearScreen();
    const { width, height } = getTerminalSize();
    const centerY = Math.floor(height / 2) - 4;
    
    // Show confetti
    displayConfetti();
    
    setTimeout(() => {
      clearScreen();
      displayConfetti();
      
      let line = centerY;
      const colorFn = chalk[rankData.color];
      
      // Rank letter (big)
      const rankSize = `
        ████████████
        ████████████
        ████████████
           ${rankData.rank} RANK
        ████████████
        ████████████
        ████████████
      `;
      
      process.stdout.write(`\x1b[${line++};0H${centerText(colorFn.bold('═══════════════════════════════'), width)}`);
      line++;
      process.stdout.write(`\x1b[${line++};0H${centerText(colorFn.bold(`${rankData.rank} RANK`), width)}`);
      process.stdout.write(`\x1b[${line++};0H${centerText(colorFn(rankData.message), width)}`);
      line++;
      process.stdout.write(`\x1b[${line++};0H${centerText(chalk.white(`Time: ${timeUsed.toFixed(2)}s`), width)}`);
      process.stdout.write(`\x1b[${line++};0H${centerText(colorFn.bold('═══════════════════════════════'), width)}`);
      
      displayConfetti();
      setTimeout(resolve, 2000);
    }, 500);
  });
}

// Calculate speed multiplier based on level
function getSpeedMultiplier() {
  return 1 + (currentLevel - 1) * 0.1;
}

// Start timer countdown
function startTimer() {
  startTime = Date.now();
  timeRemaining = timeLimit;
  
  const speedMultiplier = getSpeedMultiplier();
  const updateInterval = Math.max(50, 100 / speedMultiplier);
  
  timerInterval = setInterval(() => {
    timeRemaining = timeLimit - ((Date.now() - startTime) / 1000) * speedMultiplier;
    
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    } else {
      displayUI();
    }
  }, updateInterval);
}

// Update display during typing
function updateDisplay() {
  displayUI();
}

// Handle timeout
async function handleTimeout() {
  clearInterval(timerInterval);
  
  clearScreen();
  const { width, height } = getTerminalSize();
  const centerY = Math.floor(height / 2) - 3;
  
  let line = centerY;
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.red.bold('TRY AGAIN'), width)}`);
  line++;
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray(`Command was: ${chalk.white(currentCommand)}`), width)}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  nextCommand();
}

// Handle correct answer
async function handleCorrect(timeUsed) {
  clearInterval(timerInterval);
  
  const rankData = getRank(timeUsed, timeLimit);
  const points = rankData.rank === 'S' ? 100 : 
                 rankData.rank === 'A' ? 75 :
                 rankData.rank === 'B' ? 50 :
                 rankData.rank === 'C' ? 25 : 10;
  
  totalScore += points;
  commandsCompleted++;
  
  // Level up every 10 commands
  if (commandsCompleted % 10 === 0) {
    currentLevel++;
  }
  
  // Update high score
  if (totalScore > highScore) {
    highScore = totalScore;
    saveHighScore(highScore);
  }
  
  await displayRank(rankData, timeUsed);
  
  if (commandsCompleted >= commands.length) {
    clearScreen();
    const { width, height } = getTerminalSize();
    const centerY = Math.floor(height / 2) - 4;
    
    let line = centerY;
    process.stdout.write(`\x1b[${line++};0H${centerText(chalk.green.bold('CONGRATULATIONS'), width)}`);
    line++;
    process.stdout.write(`\x1b[${line++};0H${centerText(chalk.white('You completed all commands!'), width)}`);
    line++;
    process.stdout.write(`\x1b[${line++};0H${centerText(chalk.yellow.bold(`Final Score: ${totalScore}`), width)}`);
    process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray(`High Score: ${highScore}`), width)}`);
    
    process.stdout.write('\x1b[?25h');
    rl.close();
    process.exit(0);
  } else {
    nextCommand();
  }
}

// Load next command
function nextCommand() {
  if (commandsCompleted >= shuffledCommands.length) {
    clearScreen();
    const { width, height } = getTerminalSize();
    const centerY = Math.floor(height / 2);
    
    process.stdout.write(`\x1b[${centerY};0H${centerText(chalk.green.bold('ALL COMMANDS COMPLETED'), width)}`);
    
    process.stdout.write('\x1b[?25h');
    rl.close();
    process.exit(0);
    return;
  }
  
  currentCommand = shuffledCommands[commandsCompleted];
  timeLimit = getTimeLimit(currentCommand);
  userInput = '';
  
  displayUI();
  startTimer();
}

// Show intro
async function showIntro() {
  clearScreen();
  const { width, height } = getTerminalSize();
  const centerY = Math.floor(height / 2) - 8;
  
  let line = centerY;
  
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.bold.cyan('╔═══════════════════════════════════════╗'), width)}`);
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.bold.cyan('║           A R C H T Y P E             ║'), width)}`);
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.bold.cyan('╚═══════════════════════════════════════╝'), width)}`);
  line += 2;
  
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.white('MonkeyType for Arch Linux Commands'), width)}`);
  line += 2;
  
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray('Type commands as fast as you can'), width)}`);
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray('Timer speeds up as you level up'), width)}`);
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray('Get ranked: S, A, B, C, or D'), width)}`);
  process.stdout.write(`\x1b[${line++};0H${centerText(chalk.gray('150+ commands to master'), width)}`);
  line += 2;
  
  if (highScore > 0) {
    process.stdout.write(`\x1b[${line++};0H${centerText(chalk.yellow(`High Score: ${highScore}`), width)}`);
    line++;
  }
  
  process.stdout.write(`\x1b[${line};0H${centerText(chalk.white('Press ENTER to start...'), width)}`);
  
  await new Promise(resolve => {
    rl.once('line', resolve);
  });
}

// Handle keypress
function setupInput() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', (char, key) => {
    if (key && key.ctrl && key.name === 'c') {
      clearInterval(timerInterval);
      process.stdout.write('\x1b[?25h');
      process.exit(0);
    }
    
    if (key && key.name === 'return') {
      if (userInput === currentCommand) {
        const timeUsed = (Date.now() - startTime) / 1000;
        handleCorrect(timeUsed);
      }
      return;
    }
    
    if (key && key.name === 'backspace') {
      userInput = userInput.slice(0, -1);
      displayUI();
      return;
    }
    
    if (char && !key.ctrl && !key.meta) {
      userInput += char;
      
      if (userInput === currentCommand) {
        const timeUsed = (Date.now() - startTime) / 1000;
        handleCorrect(timeUsed);
      } else {
        displayUI();
      }
    }
  });
}

// Initialize game
async function init() {
  await showIntro();
  setupInput();
  nextCommand();
}

// Handle exit
process.on('exit', () => {
  process.stdout.write('\x1b[?25h');
});

// Start the game
init();
