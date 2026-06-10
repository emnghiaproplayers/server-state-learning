import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!authHeader) {
        throw new Error('Missing token');
      }
      const token = authHeader.replace('Bearer ', '');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'jwt_secret_server_state_learning_2026',
      });
      client.data.username = payload.username;
      this.logger.log(`Socket authenticated: ${client.id} (Username: ${payload.username})`);
    } catch (error) {
      const err = error as any;
      this.logger.warn(`Authentication failed for socket ${client.id}: ${err.message}`);
      client.emit('authError', { message: 'Authentication failed: ' + err.message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const { room, username } = client.data || {};
    this.logger.log(`Socket disconnected: ${client.id} (username: ${username || 'none'}, room: ${room || 'none'})`);
    if (room && username) {
      client.to(room).emit('roomToClient', { kind: 'leave', nickname: username });
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { room: string }) {
    const nickname = client.data.username;
    if (!nickname) {
      client.emit('error', { message: 'Unauthorized socket data.' });
      client.disconnect(true);
      return;
    }
    client.data.room = payload.room;
    client.join(payload.room);
    this.logger.log(`Socket ${client.id} (${nickname}) joined room: ${payload.room}`);
    // Notify room members
    client.to(payload.room).emit('roomToClient', { kind: 'join', nickname });
  }

  @SubscribeMessage('chatToServer')
  async handleChat(client: Socket, payload: { text: string }) {
    const { room, username } = client.data || {};

    if (!room || !username) {
      this.logger.warn(`Client ${client.id} attempted to send a message without joining a room.`);
      client.emit('error', { message: 'You must join a room first.' });
      return;
    }

    const saved = await this.chatService.saveMessage(client.id, username, room, payload.text);
    this.server.to(room).emit('chatToClient', saved);
  }
}
