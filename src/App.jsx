import { useState } from 'react';

const mockPlayersOnline = 124;

function createBoard() {
  const board = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const dark = (row + col) % 2 === 1;

      let piece = null;

      if (dark && row < 3) piece = 'black';
      if (dark && row > 4) piece = 'red';

      board.push({
        row,
        col,
        dark,
        piece,
      });
    }
  }

  return board;
}

export default function App() {
  const [nickname, setNickname] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [searching, setSearching] = useState(false);

  const board = createBoard();

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Checkers Online</h1>
          <p>{mockPlayersOnline} players online</p>
        </div>

        {loggedIn && (
          <div className="profile-pill">
            {nickname}
          </div>
        )}
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
            <button
              className={searching ? 'active' : ''}
              onClick={() => setSearching(!searching)}
            >
              {searching ? 'Searching opponent...' : 'Find Match'}
            </button>

            <button>Leaderboard</button>
            <button>Profile</button>
          </div>

          <div className="board-wrapper">
            <div className="board">
              {board.map((cell, index) => (
                <div
                  key={index}
                  className={`cell ${cell.dark ? 'dark' : 'light'}`}
                >
                  {cell.piece && (
                    <div className={`piece ${cell.piece}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
