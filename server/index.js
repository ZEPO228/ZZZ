import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();
app.use(cors());

// Serve static files if needed later
// app.use(express.static('dist'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let onlinePlayers = 0;
const waitingPlayers = [];
const games = new Map(); // gameId -> game state

function broadcast(wsArray, data) {
  wsArray.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  onlinePlayers++;
  console.log('Player connected. Online:', onlinePlayers);

  send(ws, { type: 'ONLINE_COUNT', count: onlinePlayers });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'SET_NICKNAME') {
        ws.nickname = data.nickname;
      }

      if (data.type === 'QUEUE_JOIN') {
        waitingPlayers.push(ws);
        console.log('Player joined queue');

        if (waitingPlayers.length >= 2) {
          const p1 = waitingPlayers.shift();
          const p2 = waitingPlayers.shift();

          const gameId = 'game_' + Date.now();

          const game = {
            id: gameId,
            players: [p1, p2],
            board: [], // will be set on frontend initially
            currentTurn: 'red'
          };

          games.set(gameId, game);

          send(p1, {
            type: 'MATCH_FOUND',
            opponent: p2.nickname || 'Player2',
            color: 'red',
            gameId
          });

          send(p2, {
            type: 'MATCH_FOUND',
            opponent: p1.nickname || 'Player1',
            color: 'black',
            gameId
          });
        }
      }

      if (data.type === 'MAKE_MOVE') {
        // Simple relay for now
        const game = Array.from(games.values()).find(g => g.players.includes(ws));
        if (game) {
          game.board = data.board;
          game.currentTurn = data.currentTurn;

          broadcast(game.players, {
            type: 'MOVE',
            board: data.board,
            currentTurn: data.currentTurn
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    onlinePlayers = Math.max(0, onlinePlayers - 1);
    console.log('Player disconnected. Online:', onlinePlayers);

    // Remove from waiting queue if present
    const index = waitingPlayers.indexOf(ws);
    if (index > -1) waitingPlayers.splice(index, 1);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
