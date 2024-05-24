from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, send, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_secret_key'
socketio = SocketIO(app)

rooms = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    
    if room not in rooms:
        rooms[room] = {
            'players': [],
            'board': [''] * 9,
            'current_player': 'X',
            'wins': {'X': 0, 'O': 0},
            'matches': 0,
            'last_starter': 'O'  # To toggle the starter
        }
    
    if len(rooms[room]['players']) < 2:
        player_symbol = 'X' if len(rooms[room]['players']) == 0 else 'O'
        rooms[room]['players'].append((username, request.sid, player_symbol))
        emit('assign_symbol', {'symbol': player_symbol, 'room': room}, room=request.sid)
        emit('message', {'msg': f"{username} ({player_symbol}) has joined room {room}."}, room=room)
        emit('update_stats', {
            'wins': rooms[room]['wins'],
            'matches': rooms[room]['matches'],
            'current_match': rooms[room]['matches'] + 1,
            'symbol': player_symbol
        }, room=request.sid)
    else:
        emit('message', {'msg': "Room is full."}, room=request.sid)

@socketio.on('move')
def on_move(data):
    room = data['room']
    cell = int(data['cell'].replace('cell', ''))
    player = data['player']
    rooms[room]['board'][cell] = player
    rooms[room]['current_player'] = 'O' if player == 'X' else 'X'
    emit('move', data, room=room)
    
@socketio.on('game_over')
def on_game_over(data):
    room = data['room']
    winner = data['winner']
    rooms[room]['matches'] += 1
    if winner != 'Draw':
        rooms[room]['wins'][winner] += 1
    emit('update_stats', {
        'wins': rooms[room]['wins'],
        'matches': rooms[room]['matches'],
        'current_match': rooms[room]['matches']
    }, room=room)

@socketio.on('reset')
def on_reset(data):
    room = data['room']
    rooms[room]['board'] = [''] * 9
    rooms[room]['last_starter'] = 'O' if rooms[room]['last_starter'] == 'X' else 'X'
    rooms[room]['current_player'] = rooms[room]['last_starter']
    emit('reset_game', {'starter': rooms[room]['current_player']}, room=room)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
