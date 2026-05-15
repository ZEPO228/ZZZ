import { useEffect, useState } from 'react';

function createInitialBoard() {
  const cells = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const dark = (row + col) % 2 === 1;
      let piece = null;

      if (dark && row < 3) piece = 'black';
      if (dark && row > 4) piece = 'red';

      cells.push({ row, col, dark, piece });
    }
  }

  return cells;
}

export default function App() {
  const [nickname, setNickname] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [searching, setSearching] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [matchFound, setMatchFound] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [playerColor, setPlayerColor] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [turn, setTurn] = useState('red');
  const [board, setBoard] = useState(createInitialBoard());

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.hostname}:3001`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'ONLINE_COUNT') {
        setOnlinePlayers(data.count);
      }

      if (data.type === 'MATCH_FOUND') {
        setSearching(false);
        setMatchFound(true);
        setOpponent(data.opponent);
        setPlayerColor(data.color);
      }
    };

    window.gameSocket = ws;

    return () => ws.close();
  }, []);

  function queueMatch() {
    if (!window.gameSocket) return;

    setSearching(true);

    window.gameSocket.send(JSON.stringify({
      type: 'QUEUE_JOIN',
      nickname,
    }));
  }

  function handleCellClick(index) {
    const cell = board[index];

    if (selectedCell === null) {
      if (cell.piece === turn) {
        setSelectedCell(index);
      }

      return;
    }

    const selected = board[selectedCell];

    if (!cell.piece && cell.dark) {
      const updated = [...board];
      updated[index].piece = selected.piece;
      updated[selectedCell].piece = null;

      setBoard(updated);
      setSelectedCell(null);
      setTurn(turn === 'red' ? 'black' : 'red');
    } else {
      setSelectedCell(null);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Checkers Online</h1>
          <p>{onlinePlayers} players online</p>
        </div>

        {loggedIn && <div className="profile-pill">{nickname}</div>}
      </header>

      {!loggedIn ? (
        <div className="auth-card">
          <h2>Quick Login</h2>
          <p>Enter nickname to start playing online</p>

          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname"
            maxLength={16}
          />

          <button
            disabled={!nickname.trim()}
            onClick={() => setLoggedIn(true)}
          >
            Enter Game
          </button>
        </div>
      ) : (
        <>
          <div className="game-toolbar">
            <button className={searching ? 'active' : ''} onClick={queueMatch}>
              {searching ? 'Searching...' : 'Find Match'}
            </button>

            <button>{turn.toUpperCase()} TURN</button>
            <button>{matchFound ? 'ONLINE MATCH' : 'LOCAL MODE'}</button>
          </div>

          {matchFound && (
            <div className="match-banner">
              <strong>Match Found</strong>
              <span>{nickname} vs {opponent}</span>
              <span>You play: {playerColor}</span>
            </div>
          )}

          <div className="board-wrapper">
            <div className="board">
              {board.map((cell, index) => (
                <div
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className={`cell ${cell.dark ? 'dark' : 'light'} ${selectedCell === index ? 'selected' : ''}`}
                >
                  {cell.piece && <div className={`piece ${cell.piece}`} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
