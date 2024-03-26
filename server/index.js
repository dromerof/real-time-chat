import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { Server } from 'socket.io';
import { createServer } from 'http';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const port = process.env.PORT || 3001; // Puerto de la aplicación

// Creación de la aplicación Express y el servidor HTTP
const app = express();
const server = createServer(app);

// Configuración del servidor de Socket.IO
const io = new Server(server, {
  connectionStateRecovery: {} // Configuración para la recuperación del estado de conexión
});

// Cliente para la base de datos
const db = createClient({
  url: 'libsql://fitting-warpath-dromerof.turso.io', // URL de la base de datos
  authToken: process.env.DB_TOKEN // Token de autenticación para acceder a la base de datos
});

// Creación de la tabla 'messages' si no existe en la base de datos
try {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      user TEXT
    )
  `);
} catch (error) {
  throw new Error("Error al crear la tabla 'messages' en la base de datos:", error);
}

// Manejo de conexiones de sockets
io.on('connection', async (socket) => {
  // Manejo de la desconexión de sockets
  socket.on('disconnect', () => {
    console.log('A user has disconnected');
  });

  // Manejo de mensajes de chat
  socket.on('chat message', async (msg) => {
    const username = socket.handshake.auth.username ?? 'anonymous'; // Nombre de usuario
    let result;

    try {
      // Inserta el mensaje en la base de datos
      result = await db.execute({
        sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
        args: { msg, username }
      });
    } catch (error) {
      throw new Error("Error al insertar el mensaje en la base de datos:", error);

    }

    // Emite el mensaje a todos los clientes conectados
    io.emit('chat message', msg,  result.lastInsertRowid.toString(), username);
  });

  // Recuperación de mensajes anteriores en caso de reconexión
  if (!socket.recovered) {
    try {
      // Consulta mensajes de la base de datos
      const results = await db.execute({
        sql: 'SELECT id, content, user FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      });

      // Envía mensajes anteriores al cliente reconectado
      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.user);
      });
    } catch (error) {
      throw new Error("Error al recuperar mensajes anteriores de la base de datos:", error);
    }
  }
});

// Configuración de middleware
app.use(logger('dev')); // Middleware de registro de solicitudes HTTP

// Configura Express para servir archivos estáticos desde el directorio 'public'
app.use(express.static('public'));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); // Envía el archivo HTML principal
});

// Inicia el servidor en el puerto especificado
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});