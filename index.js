#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import { commands, getTimeLimit, getRank } from './commands.js';

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
  process.stdout.write('\x1b[2J\x1b[H');
}

// Move cursor to position
function moveCursor(x, y) {
  process.stdout.write(`\x1b[${y};${x}H`);
}

// Display header with stats
function displayHeader() {
  moveCursor(0, 1);
  console.log(chalk.bold.blue('╔════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║') + chalk.bold.cyan('                         ARCHTYPE                               ') + chalk.bold.blue('║'));
  console.log(chalk.bold.blue('╚════════════════════════════════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray(`  Commands completed: ${chalk.white(commandsCompleted)}/${commands.length}  •  Total Score: ${chalk.white(totalScore)}`));
  console.log('');
}

// Display the command to type
function displayCommand() {
  console.log(chalk.bold.white('  Type this command:'));
  console.log('');
  console.log('  ' + chalk.bgBlue.white.bold(` ${currentCommand} `));
  console.log('');
}

// Display timer
function displayTimer() {
  const percentage = (timeRemaining / timeLimit) * 100;
  let color = chalk.green;
  
  if (percentage < 30) color = chalk.red;
  else if (percentage < 50) color = chalk.yellow;
  
  const barLength = 50;
  const filled = Math.round((timeRemaining / timeLimit) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  console.log('  ' + color(`Time: ${timeRemaining.toFixed(1)}s / ${timeLimit.toFixed(1)}s`));
  console.log('  ' + color(bar));
  console.log('');
}

// Display rank animation
async function displayRank(rankData, timeUsed) {
  return new Promise((resolve) => {
    clearScreen();
    
    const rankArt = `
    
    ███████╗  ████████╗   █████╗   ███╗   ██╗  ██╗  ██╗
    ██╔══██╗  ╚══██╔══╝  ██╔══██╗  ████╗  ██║  ██║ ██╔╝
    ██████╔╝     ██║     ███████║  ██╔██╗ ██║  █████╔╝ 
    ██╔══██╗     ██║     ██╔══██║  ██║╚██╗██║  ██╔═██╗ 
    ██║  ██║     ██║     ██║  ██║  ██║ ╚████║  ██║  ██╗
    ╚═╝  ╚═╝     ╚═╝     ╚═╝  ╚═╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝
    
           ${rankData.rank} - ${rankData.message}
           
           Time: ${timeUsed.toFixed(2)}s
    `;
    
    moveCursor(0, 3);
    
    const colorFn = chalk[rankData.color];
    const rainbow = chalkAnimation.rainbow(rankArt);
    
    setTimeout(() => {
      rainbow.stop();
      console.log(colorFn.bold(rankArt));
      setTimeout(resolve, 2000);
    }, 1000);
  });
}

// Start timer countdown
function startTimer() {
  startTime = Date.now();
  timeRemaining = timeLimit;
  
  timerInterval = setInterval(() => {
    timeRemaining = timeLimit - (Date.now() - startTime) / 1000;
    
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    } else {
      updateDisplay();
    }
  }, 100);
}

// Update display during typing
function updateDisplay() {
  clearScreen();
  displayHeader();
  displayCommand();
  displayTimer();
  process.stdout.write(chalk.white('  > '));
}

// Handle timeout
function handleTimeout() {
  clearInterval(timerInterval);
  rl.close();
  
  clearScreen();
  console.log('');
  console.log(chalk.red.bold('  ⏰ TIME\'S UP!'));
  console.log('');
  console.log(chalk.white(`  You completed ${chalk.cyan.bold(commandsCompleted)} out of ${commands.length} commands!`));
  console.log(chalk.white(`  Total Score: ${chalk.yellow.bold(totalScore)}`));
  console.log('');
  process.exit(0);
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
  
  await displayRank(rankData, timeUsed);
  
  if (commandsCompleted >= commands.length) {
    clearScreen();
    console.log('');
    console.log(chalk.green.bold('  🎉 CONGRATULATIONS! YOU COMPLETED ALL COMMANDS!'));
    console.log('');
    console.log(chalk.white(`  Final Score: ${chalk.yellow.bold(totalScore)}`));
    console.log('');
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
    console.log('');
    console.log(chalk.green.bold('  🎉 ALL COMMANDS COMPLETED!'));
    console.log('');
    rl.close();
    process.exit(0);
    return;
  }
  
  currentCommand = shuffledCommands[commandsCompleted];
  timeLimit = getTimeLimit(currentCommand);
  
  clearScreen();
  displayHeader();
  displayCommand();
  displayTimer();
  
  process.stdout.write(chalk.white('  > '));
  
  startTimer();
}

// Show intro
async function showIntro() {
  clearScreen();
  
  const title = `
  
  ███████╗  ██████╗   ██████╗  ██╗  ██╗ ████████╗ ██╗   ██╗ ██████╗   ███████╗
  ██╔══██╗  ██╔══██╗ ██╔════╝  ██║  ██║ ╚══██╔══╝ ╚██╗ ██╔╝ ██╔══██╗  ██╔════╝
  ███████║  ██████╔╝ ██║       ███████║    ██║     ╚████╔╝  ██████╔╝  █████╗  
  ██╔══██║  ██╔══██╗ ██║       ██╔══██║    ██║      ╚██╔╝   ██╔═══╝   ██╔══╝  
  ██║  ██║  ██║  ██║ ╚██████╗  ██║  ██║    ██║       ██║    ██║       ███████╗
  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═════╝  ╚═╝  ╚═╝    ╚═╝       ╚═╝    ╚═╝       ╚══════╝
  
                    MonkeyType for Arch Linux Commands
                    
  `;
  
  const rainbow = chalkAnimation.rainbow(title);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  rainbow.stop();
  
  console.log(chalk.cyan.bold(title));
  console.log(chalk.white('  📝 Type Arch Linux commands as fast as you can!'));
  console.log(chalk.white('  ⏱️  Each command has a time limit based on its length'));
  console.log(chalk.white('  🏆 Get ranked: S, A, B, C, or D based on your speed'));
  console.log(chalk.white('  💯 150+ commands to master!'));
  console.log('');
  console.log(chalk.gray('  Press ENTER to start...'));
  
  await new Promise(resolve => {
    rl.once('line', resolve);
  });
}

// Initialize game
async function init() {
  console.log(chalk.bold.cyan('\n  Loading ARCHTYPE...\n'));
  
  await showIntro();
  nextCommand();
  
  rl.on('line', (input) => {
    const trimmedInput = input.trim();
    
    if (trimmedInput === currentCommand) {
      const timeUsed = (Date.now() - startTime) / 1000;
      handleCorrect(timeUsed);
    } else {
      // Wrong answer - just continue
      process.stdout.write(chalk.white('  > '));
    }
  });
}

// Handle exit
rl.on('close', () => {
  clearInterval(timerInterval);
  process.exit(0);
});

// Start the game
init();
