document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const cells = document.querySelectorAll('.cell');
    const turnDisplay = document.getElementById('turn');
    const resetButton = document.getElementById('reset');
    const totalMatchesDisplay = document.getElementById('total-matches');
    const currentMatchDisplay = document.getElementById('current-match');
    const winsXDisplay = document.getElementById('wins-x');
    const winsODisplay = document.getElementById('wins-o');
    const playerSymbolDisplay = document.getElementById('player-symbol');
    let currentPlayer = 'X';
    let playerSymbol = null;
    let board = ['', '', '', '', '', '', '', '', ''];
    let room = prompt('Enter room name');

    socket.emit('join', { username: `Player ${playerSymbol}`, room: room });

    const checkWin = () => {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }

        return board.includes('') ? null : 'Draw';
    };

    const updateTurnDisplay = () => {
        turnDisplay.textContent = `Player ${currentPlayer}'s Turn`;
    };

    const handleClick = (event) => {
        const cell = event.target;
        const cellIndex = cell.id.replace('cell', '');

        if (board[cellIndex] === '' && currentPlayer === playerSymbol) {
            board[cellIndex] = currentPlayer;
            cell.textContent = currentPlayer;
            socket.emit('move', { cell: cell.id, player: currentPlayer, room: room });
            const winner = checkWin();

            if (winner) {
                turnDisplay.textContent = winner === 'Draw' ? 'It\'s a Draw!' : `Player ${winner} Wins!`;
                cells.forEach(cell => cell.removeEventListener('click', handleClick));
                socket.emit('game_over', { winner: winner, room: room });
            } else {
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                updateTurnDisplay();
            }
        }
    };

    const resetGame = (starter) => {
        board = ['', '', '', '', '', '', '', '', ''];
        cells.forEach(cell => {
            cell.textContent = '';
            cell.addEventListener('click', handleClick);
        });
        currentPlayer = starter;
        updateTurnDisplay();
    };

    socket.on('move', (data) => {
        board[data.cell.replace('cell', '')] = data.player;
        document.getElementById(data.cell).textContent = data.player;
        const winner = checkWin();

        if (winner) {
            turnDisplay.textContent = winner === 'Draw' ? 'It\'s a Draw!' : `Player ${winner} Wins!`;
            cells.forEach(cell => cell.removeEventListener('click', handleClick));
        } else {
            currentPlayer = data.player === 'X' ? 'O' : 'X';
            updateTurnDisplay();
        }
    });

    socket.on('assign_symbol', (data) => {
        playerSymbol = data.symbol;
        alert(`You are Player ${playerSymbol}`);
        playerSymbolDisplay.textContent = `You are Player ${playerSymbol}`;
        updateTurnDisplay();
    });

    socket.on('message', (data) => {
        alert(data.msg);
    });

    socket.on('reset_game', (data) => {
        resetGame(data.starter);
    });

    socket.on('update_stats', (data) => {
        totalMatchesDisplay.textContent = data.matches;
        currentMatchDisplay.textContent = data.current_match;
        winsXDisplay.textContent = data.wins.X;
        winsODisplay.textContent = data.wins.O;
        playerSymbolDisplay.textContent = `You are Player ${playerSymbol}`;
        console.log("Player symbol updated:", data.symbol);
    });

    cells.forEach(cell => cell.addEventListener('click', handleClick));
    resetButton.addEventListener('click', () => socket.emit('reset', { room: room }));
    updateTurnDisplay();
});
