#!/usr/bin/env python3
import curses
import time
import random
import json
import os

def main(stdscr):
    curses.curs_set(0)
    curses.start_color()
    curses.use_default_colors()

    # Color pairs
    curses.init_pair(1, curses.COLOR_CYAN, -1)
    curses.init_pair(2, curses.COLOR_RED, -1)
    curses.init_pair(3, curses.COLOR_YELLOW, -1)
    curses.init_pair(4, curses.COLOR_GREEN, -1)
    curses.init_pair(5, curses.COLOR_MAGENTA, -1)
    curses.init_pair(6, curses.COLOR_WHITE, -1)
    curses.init_pair(7, curses.COLOR_BLUE, -1)

    # Game variables
    commands = load_commands()
    random.shuffle(commands)
    
    high_score = load_high_score()
    
    game_state = {
        "current_command_index": 0,
        "score": 0,
        "level": 1,
        "completed": 0,
        "high_score": high_score,
        "user_input": "",
        "start_time": 0,
        "time_limit": 0,
        "time_remaining": 0,
        "commands": commands,
        "current_command": ""
    }

    show_intro(stdscr)
    
    while game_state["completed"] < len(commands):
        next_command(game_state)
        status = run_level(stdscr, game_state)
        
        if status == "QUIT":
            show_game_over(stdscr, game_state, quit=True)
            return
        elif status == "TIMEOUT":
            timeout_choice = handle_timeout(stdscr, game_state)
            if timeout_choice == "RETRY":
                game_state["current_command_index"] -= 1 # Retry
            elif timeout_choice == "QUIT":
                show_game_over(stdscr, game_state, quit=True)
                return
            else: # SKIP
                game_state["completed"] += 1 # Skip
        elif status == "CORRECT":
            time_used = time.time() - game_state["start_time"]
            correct_status = handle_correct(stdscr, game_state, time_used)
            if correct_status == "QUIT":
                show_game_over(stdscr, game_state, quit=True)
                return
        elif status == "INCORRECT":
            shake_screen(stdscr, game_state)
            game_state["user_input"] = "" # Reset input on wrong enter
    
    show_game_over(stdscr, game_state)

def load_commands():
    script_path = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(script_path, 'commands.txt'), 'r') as f:
        return [line.strip() for line in f.readlines()]

def load_high_score():
    script_path = os.path.dirname(os.path.realpath(__file__))
    try:
        with open(os.path.join(script_path, '.highscore.json'), 'r') as f:
            data = json.load(f)
            return data.get("highScore", 0)
    except (FileNotFoundError, json.JSONDecodeError):
        return 0

def save_high_score(score):
    script_path = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(script_path, '.highscore.json'), 'w') as f:
        json.dump({"highScore": score}, f)

def get_time_limit(command):
    base_time = 3
    char_time = 0.15
    return max(5, base_time + (len(command) * char_time))

def get_rank(time_used, time_limit):
    percentage = (time_used / time_limit) * 100
    if percentage <= 30:
        return {'rank': 'S', 'color': 5, 'message': 'LEGENDARY!'}
    if percentage <= 50:
        return {'rank': 'A', 'color': 1, 'message': 'AMAZING!'}
    if percentage <= 70:
        return {'rank': 'B', 'color': 4, 'message': 'GOOD!'}
    if percentage <= 90:
        return {'rank': 'C', 'color': 3, 'message': 'DECENT!'}
    return {'rank': 'D', 'color': 2, 'message': 'TOO SLOW!'}

def center_text(text, width):
    return text.center(width)

def display_ui(stdscr, game_state, offset_x=0, offset_y=0):
    stdscr.clear()
    height, width = stdscr.getmaxyx()
    
    line = height // 2 - 8 + offset_y

    # Title
    stdscr.addstr(line + offset_y, 0, center_text("ARCHTYPE", width + offset_x), curses.color_pair(1) | curses.A_BOLD)
    line += 2

    # Stats
    stats = f"Level {game_state['level']}  |  Score: {game_state['score']}  |  High Score: {game_state['high_score']}  |  Completed: {game_state['completed']}/{len(game_state['commands'])}"
    stdscr.addstr(line + offset_y, 0, center_text(stats, width + offset_x), curses.color_pair(6))
    line += 2

    # Command
    stdscr.addstr(line + offset_y, 0, center_text("Type this command:", width + offset_x), curses.color_pair(6))
    line += 2
    stdscr.addstr(line + offset_y, 0, center_text(game_state["current_command"], width + offset_x), curses.color_pair(3) | curses.A_BOLD)
    line += 2

    # Timer
    percentage = (game_state["time_remaining"] / game_state["time_limit"]) * 100
    color = 4
    if percentage < 30:
        color = 2
    elif percentage < 50:
        color = 3

    bar_length = min(60, width - 20)
    filled = int((game_state["time_remaining"] / game_state["time_limit"]) * bar_length)
    
    filled = max(0, min(bar_length, filled))
    
    bar = '█' * filled + '░' * (bar_length - filled)
    
    time_text = f"{game_state['time_remaining']:.1f}s / {game_state['time_limit']:.1f}s"
    stdscr.addstr(line + offset_y, 0, center_text(time_text, width + offset_x), curses.color_pair(color))
    line += 1
    stdscr.addstr(line + offset_y, 0, center_text(bar, width + offset_x), curses.color_pair(color))
    line += 2

    # User input
    input_display_y = line + offset_y
    input_display_x = (width - len(game_state["current_command"])) // 2 + offset_x
    
    for i, char in enumerate(game_state["current_command"]):
        if i < len(game_state["user_input"]):
            if game_state["user_input"][i] == char:
                stdscr.addch(input_display_y, input_display_x + i, char, curses.color_pair(1))
            else:
                stdscr.addch(input_display_y, input_display_x + i, char, curses.color_pair(2) | curses.A_UNDERLINE)
        else:
            stdscr.addch(input_display_y, input_display_x + i, char, curses.color_pair(7))
            
    stdscr.refresh()

def show_intro(stdscr):
    stdscr.clear()
    height, width = stdscr.getmaxyx()
    
    line = height // 2 - 8
    
    intro_text = [
        "╔═══════════════════════════════════════╗",
        "║               ARCHTYPE                ║",
        "╚═══════════════════════════════════════╝",
        "",
        "MonkeyType for Arch Linux Commands",
        "",
        "Type commands as fast as you can",
        "Timer speeds up as you level up",
        "Get ranked: S, A, B, C, or D",
        "150+ commands to master",
        "",
        "Press 'p' to pause.",
        "Press Ctrl+C to quit.",
        "",
        "Press ENTER to start..."
    ]
    
    for i, text in enumerate(intro_text):
        stdscr.addstr(line + i, 0, center_text(text, width), curses.color_pair(1) | curses.A_BOLD)
        
    stdscr.refresh()
    
    while True:
        key = stdscr.getch()
        if key in [curses.KEY_ENTER, 10, 13]:
            break

def next_command(game_state):
    game_state["current_command"] = game_state["commands"][game_state["current_command_index"]]
    game_state["time_limit"] = get_time_limit(game_state["current_command"])
    game_state["user_input"] = ""
    game_state["start_time"] = time.time()
    game_state["time_remaining"] = game_state["time_limit"]
    game_state["current_command_index"] += 1

def run_level(stdscr, game_state):
    stdscr.nodelay(True)
    
    while True:
        game_state["time_remaining"] = game_state["time_limit"] - (time.time() - game_state["start_time"])
        
        if game_state["time_remaining"] <= 0:
            return "TIMEOUT"
            
        display_ui(stdscr, game_state)
        
        try:
            key = stdscr.getch()
        except curses.error:
            key = -1
        except KeyboardInterrupt:
            return "QUIT"
            
        if key != -1:
            if key == ord('p'):
                handle_pause(stdscr, game_state)
            elif key in [curses.KEY_ENTER, 10, 13]:
                if game_state["user_input"] == game_state["current_command"]:
                    return "CORRECT"
                else:
                    return "INCORRECT"
            elif key in [curses.KEY_BACKSPACE, 127, 8]:
                game_state["user_input"] = game_state["user_input"][:-1]
            elif 32 <= key <= 126:
                game_state["user_input"] += chr(key)
        
        time.sleep(0.01)

def handle_correct(stdscr, game_state, time_used):
    rank_data = get_rank(time_used, game_state["time_limit"])
    points = {'S': 100, 'A': 75, 'B': 50, 'C': 25, 'D': 10}[rank_data['rank']]
    
    game_state["score"] += points
    game_state["completed"] += 1
    
    if game_state["completed"] % 10 == 0:
        game_state["level"] += 1
        
    if game_state["score"] > game_state["high_score"]:
        game_state["high_score"] = game_state["score"]
        save_high_score(game_state["high_score"])
        
    rank_status = display_rank(stdscr, rank_data, time_used)
    if rank_status == "QUIT":
        return "QUIT"
    
    return "CORRECT"

def handle_pause(stdscr, game_state):
    stdscr.nodelay(False)
    height, width = stdscr.getmaxyx()
    stdscr.addstr(height // 2, 0, center_text("PAUSED", width), curses.color_pair(3) | curses.A_BOLD)
    stdscr.addstr(height // 2 + 1, 0, center_text("Press 'p' to resume", width), curses.color_pair(6))
    stdscr.refresh()
    
    while True:
        key = stdscr.getch()
        if key == ord('p'):
            game_state["start_time"] = time.time() - (game_state["time_limit"] - game_state["time_remaining"])
            break
    stdscr.nodelay(True)

def handle_timeout(stdscr, game_state):
    stdscr.nodelay(False)
    height, width = stdscr.getmaxyx()
    stdscr.addstr(height // 2, 0, center_text("TIME'S UP!", width), curses.color_pair(2) | curses.A_BOLD)
    stdscr.addstr(height // 2 + 1, 0, center_text("Press 'r' to retry, 'q' to quit, or any other key to skip.", width), curses.color_pair(6))
    stdscr.refresh()
    
    key = stdscr.getch()
    if key == ord('r'):
        return "RETRY"
    elif key == ord('q'):
        return "QUIT"
    else:
        return "SKIP"

def display_rank(stdscr, rank_data, time_used):
    stdscr.clear()
    height, width = stdscr.getmaxyx()
    line = height // 2 - 2
    
    rank_message = f"{rank_data['rank']} RANK - {rank_data['message']}"
    time_message = f"Time: {time_used:.2f}s"
    
    stdscr.addstr(line, 0, center_text(rank_message, width), curses.color_pair(rank_data['color']) | curses.A_BOLD)
    stdscr.addstr(line + 1, 0, center_text(time_message, width), curses.color_pair(6))
    stdscr.addstr(height - 1, 0, center_text("Press 'q' to quit or any other key to continue.", width), curses.color_pair(6))
    stdscr.refresh()
    
    key = stdscr.getch()
    if key == ord('q'):
        return "QUIT"
    else:
        return "CONTINUE"

def show_game_over(stdscr, game_state, quit=False):
    stdscr.clear()
    height, width = stdscr.getmaxyx()
    line = height // 2 - 4
    
    if quit:
        messages = [
            "GAME OVER",
            "",
            f"Your Score: {game_state['score']}",
            f"High Score: {game_state['high_score']}",
            "",
            "Press any key to exit..."
        ]
    else:
        messages = [
            "CONGRATULATIONS!",
            "You completed all commands!",
            "",
            f"Final Score: {game_state['score']}",
            f"High Score: {game_state['high_score']}",
            "",
            "Press any key to exit..."
        ]
    
    for i, msg in enumerate(messages):
        stdscr.addstr(line + i, 0, center_text(msg, width), curses.color_pair(4) | curses.A_BOLD)
        
    stdscr.refresh()
    stdscr.nodelay(False)
    stdscr.getch()

def shake_screen(stdscr, game_state):
    for i in range(3):
        display_ui(stdscr, game_state, offset_x=5)
        time.sleep(0.05)
        display_ui(stdscr, game_state, offset_x=-5)
        time.sleep(0.05)
    display_ui(stdscr, game_state)

if __name__ == "__main__":
    curses.wrapper(main)
