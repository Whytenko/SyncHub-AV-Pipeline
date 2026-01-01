const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'SyncHub работает!' }));
});
server.listen(5000, () => console.log('Сервер запущен на порту 5000'));
