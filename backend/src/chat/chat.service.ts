import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageEntity } from './chat-message.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly chatMessageRepository: Repository<ChatMessageEntity>,
  ) {}

  async saveMessage(
    senderId: string,
    nickname: string,
    room: string,
    text: string,
  ): Promise<ChatMessageEntity> {
    const message = this.chatMessageRepository.create({
      senderId,
      nickname,
      room,
      text,
    });
    const saved = await this.chatMessageRepository.save(message);
    this.logger.log(
      `Message saved: [${room}] ${nickname} (${senderId}): "${text}" (ID: ${saved.id})`,
    );
    return saved;
  }
}
