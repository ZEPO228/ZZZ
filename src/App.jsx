import { useEffect, useState, useCallback } from 'react';

function createInitialBoard() {
  const board = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isDark = (row + col) % 2 === 1;
      let piece = null;
      if (isDark) {
        if (row < 3) piece = { type: 'black', king: false };
        if (row > 4) piece = { type: 'red', king: false };
      }
      board.push({ row, col, isDark, piece });
    }
  }
  return board;
}

export default function App() {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [screen, setScreen] = useState('menu'); // menu, searching, game
  const [gameState, setGameState] = useState({ board: [], myColor: null, opponent: '', currentTurn: 'red', gameId: null });
  const [selectedCell, setSelectedCell] = useState(null);
  const [status, setStatus] = useState('');
  const [ws, setWs] = useState(null);
  const [theme, setTheme] = useState('dark');

  // WebSocket connection
  useEffect(() => {
    if (!loggedIn || !nickname) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // For local: use localhost:3001, for prod use same host with proper port or proxy
    let socketUrl;
    if (window.location.hostname === 'localhost') {
      socketUrl = `ws://localhost:3001`;
    } else {
      socketUrl = `${protocol}//${window.location.hostname}/ws`; // adjust if needed for Railway
    }

    const socket = new WebSocket(socketUrl);
    setWs(socket);

    socket.onopen = () => {
      console.log('WS connected');
      socket.send(JSON.stringify({ type: 'SET_NICKNAME', nickname }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);

      if (data.type === 'ONLINE_COUNT') {
        setOnlinePlayers(data.count);
      } else if (data.type === 'MATCH_FOUND') {
        setScreen('game');
        setGameState(prev => ({
          ...prev,
          myColor: data.color,
          opponent: data.opponent,
          board: createInitialBoard(),
          currentTurn: 'red',
          gameId: data.gameId || 'current'
        }));
        setStatus(`Игра против ${data.opponent}`);
      } else if (data.type === 'MOVE') {
        setGameState(prev => ({
          ...prev,
          board: data.board,
          currentTurn: data.currentTurn
        }));
      }
    };

    socket.onclose = () => console.log('WS closed');
    socket.onerror = (err) => console.error('WS error', err);

    return () => {
      socket.close();
    };
  }, [loggedIn, nickname]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const startSearch = () => {
    if (!ws) return;
    setScreen('searching');
    setStatus('Поиск соперника...');
    ws.send(JSON.stringify({ type: 'QUEUE_JOIN', nickname }));
  };

  const makeMove = useCallback((fromIndex, toIndex) => {
    if (!ws || !gameState.board.length) return;

    const newBoard = [...gameState.board];
    const fromCell = newBoard[fromIndex];
    const toCell = newBoard[toIndex];

    if (!fromCell.piece || toCell.piece || !toCell.isDark) return;

    // Simple move validation (diagonal, one step)
    const rowDiff = Math.abs(fromCell.row - toCell.row);
    const colDiff = Math.abs(fromCell.col - toCell.col);

    if (rowDiff === 1 && colDiff === 1) {
      newBoard[toIndex].piece = fromCell.piece;
      newBoard[fromIndex].piece = null;

      const newTurn = gameState.myColor === 'red' ? 'black' : 'red';

      setGameState(prev => ({ ...prev, board: newBoard, currentTurn: newTurn }));

      ws.send(JSON.stringify({
        type: 'MAKE_MOVE',
        from: fromIndex,
        to: toIndex,
        board: newBoard,
        currentTurn: newTurn
      }));

      setSelectedCell(null);
    }
  }, [ws, gameState]);

  const handleCellClick = (index) => {
    if (screen !== 'game') return;

    const cell = gameState.board[index];
    if (!cell) return;

    if (selectedCell !== null) {
      makeMove(selectedCell, index);
    } else if (cell.piece && cell.piece.type === gameState.myColor && gameState.currentTurn === gameState.myColor) {
      setSelectedCell(index);
    }
  };

  const renderBoard = () => {
    return (
      <div className="board">
        {gameState.board.map((cell, index) => {
          const isSelected = selectedCell === index;
          const isMyPiece = cell.piece && cell.piece.type === gameState.myColor;

          return (
            <div
              key={index}
              className={`cell ${cell.isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleCellClick(index)}
            >
              {cell.piece && (
                <div className={`piece ${cell.piece.type} ${cell.piece.king ? 'king' : ''}`}>
                  {cell.piece.king ? '♔' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`app ${theme}`}>
      <header>
        <h1>Шашки Онлайн</h1>
        <div className="online">Онлайн: {onlinePlayers}</div>
      </header>

      {!loggedIn ? (
        <div className="login-screen">
          <h2>Вход</h2>
          <input 
            value={nickname} 
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Никнейм"
            maxLength={15}
          />
          <label>
            Аватар
            <input type="file" accept="image/*" onChange={handleAvatarUpload} />
          </label>
          {avatar && <img src={avatar} alt="avatar" className="preview" />}
          <button onClick={() => setLoggedIn(true)} disabled={!nickname.trim()}>Войти</button>
        </div>
      ) : screen === 'menu' ? (
        <div className="menu-screen">
          <h2>Добро пожаловать, {nickname}</h2>
          <button onClick={startSearch}>Найти игру</button>
        </div>
      ) : screen === 'searching' ? (
        <div className="searching-screen">
          <h2>Поиск соперника...</h2>
          <p>{status}</p>
          <button onClick={() => setScreen('menu')}>Отмена</button>
        </div>
      ) : screen === 'game' ? (
        <div className="game-screen">
          <div className="game-header">
            <div>Вы: {gameState.myColor === 'red' ? '🔴' : '⚫'}</div>
            <div>Противник: {gameState.opponent}</div>
            <div>Ход: {gameState.currentTurn}</div>
          </div>
          {renderBoard()}
          <button onClick={() => setScreen('menu')}>Выйти</button>
        </div>
      ) : null}

      {status && <div className="status">{status}</div>}
    </div>
  );
}
