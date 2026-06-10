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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const { room, nickname } = client.data || {};
    this.logger.log(`Client disconnected: ${client.id} (Room: ${room || 'none'}, Nickname: ${nickname || 'none'})`);
    if (room && nickname) {
      client.to(room).emit('roomToClient', { kind: 'leave', nickname });
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, payload: { room: string; nickname: string }) {
    client.data.room = payload.room;
    client.data.nickname = payload.nickname;
    client.join(payload.room);
    this.logger.log(`Client ${client.id} (${payload.nickname}) joined room: ${payload.room}`);
    // Notify others in the room
    client.to(payload.room).emit('roomToClient', { kind: 'join', nickname: payload.nickname });
  }

  @SubscribeMessage('chatToServer')
  async handleChat(client: Socket, payload: { text: string }) {
    const { room, nickname } = client.data || {};
    
    // Validate that the client has joined a room
    if (!room || !nickname) {
      this.logger.warn(`Client ${client.id} attempted to send a message without joining a room.`);
      client.emit('error', { message: 'You must join a room first.' });
      return;
    }

    const saved = await this.chatService.saveMessage(client.id, nickname, room, payload.text);
    
    // Broadcast the message only to the room members
    this.server.to(room).emit('chatToClient', saved);
  }
}
