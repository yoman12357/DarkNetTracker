const sockets = new Set();

export function registerSocketUpgrade(server, wss) {
  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws/live") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      sockets.add(ws);
      ws.on("close", () => {
        sockets.delete(ws);
      });
    });
  });
}

export function broadcastEvent(event) {
  const message = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === 1) {
      socket.send(message);
    }
  }
}
