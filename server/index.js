import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let onlinePlayers = 0;
const waitingPlayers = [];

app.get('/', (_, res) => {
  res.json({
    status: 'online',
    onlinePlayers,
  });
});

function send(ws, data) {
  ws.send(JSON.stringify(data));
}

wss.on('connection', (ws) => {
  onlinePlayers++;

  send(ws, {
    type: 'ONLINE_COUNT',
    count: onlinePlayers,
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'QUEUE_JOIN') {
        waitingPlayers.push({
          ws,
          nickname: data.nickname,
        });

        if (waitingPlayers.length >= 2) {
          const p1 = waitingPlayers.shift();
          const p2 = waitingPlayers.shift();

          send(p1.ws, {
            type: 'MATCH_FOUND',
            opponent: p2.nickname,
            color: 'red',
          });

          send(p2.ws, {
            type: 'MATCH_FOUND',
            opponent: p1.nickname,
            color: 'black',
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  ws.on('close', () => {
    onlinePlayers--;
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('Server started on port', PORT);
});
