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
  const [avatar, setAvatar] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState(1);
  const [selectedCell, setSelectedCell] = useState(null);
  const [turn, setTurn] = useState('red');
  const [board, setBoard] = useState(createInitialBoard());
  const [screen, setScreen] = useState('menu');
  const [statusMessage, setStatusMessage] = useState('');
  const [weather] = useState('☀️ +22°C');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.hostname}:3001`);

    ws.onopen = () => setOnlinePlayers(1);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'ONLINE_COUNT') {
        setOnlinePlayers(Math.max(1, data.count));
      }
    };

    return () => ws.close();
  }, []);

  function handleAvatarUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setAvatar(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function startSearch() {
    setScreen('search');

    setTimeout(() => {
      setScreen('menu');
      setStatusMessage('Сейчас нет свободных игроков');
    }, 10000);
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
      <div className="background-glow"></div>

      <header className="topbar fade-in">
        <div>
          <h1>Шашки Онлайн</h1>

          <div className="online-box">
            <div className="online-dot"></div>
            <span>{onlinePlayers} игроков онлайн</span>
          </div>

          <div className="weather-box">
            {weather}
          </div>
        </div>

        {loggedIn && (
          <div className="profile-area">
            {avatar ? (
              <img src={avatar} className="avatar" alt="avatar" />
            ) : (
              <div className="avatar empty-avatar">?</div>
            )}

            <div className="profile-pill">{nickname}</div>
          </div>
        )}
      </header>

      {!loggedIn ? (
        <div className="auth-card centered fade-in">
          <h2>Добро пожаловать</h2>
          <p>Войди чтобы начать игру</p>

          <div className="avatar-upload">
            {avatar ? (
              <img src={avatar} className="avatar large-avatar" alt="avatar" />
            ) : (
              <div className="avatar large-avatar empty-avatar">+</div>
            )}

            <label className="upload-button">
              Загрузить аватар
              <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </label>
          </div>

          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Введите никнейм"
            maxLength={16}
          />

          <button
            disabled={!nickname.trim()}
            onClick={() => setLoggedIn(true)}
          >
            Играть
          </button>
        </div>
      ) : (
        <>
          {screen === 'menu' && (
            <div className="auth-card centered fade-in">
              <h2>Главное меню</h2>
              <p>Сразись против других игроков онлайн</p>

              <button onClick={startSearch}>
                Найти матч
              </button>

              {statusMessage && (
                <div className="status-message">
                  {statusMessage}
                </div>
              )}
            </div>
          )}

          {screen === 'search' && (
            <div className="auth-card centered fade-in">
              <div className="loader"></div>
              <h2>Поиск соперника</h2>
              <p>Ищем свободного игрока...</p>
            </div>
          )}

          {screen === 'game' && (
            <div className="fade-in">
              <div className="game-toolbar">
                <button className="active">
                  Онлайн матч
                </button>

                <button>
                  Ход: {turn === 'red' ? 'Красные' : 'Чёрные'}
                </button>
              </div>

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
            </div>
          )}
        </>
      )}
    </div>
  );
}
