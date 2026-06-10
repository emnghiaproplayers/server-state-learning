import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chat_message')
export class ChatMessageEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  senderId!: string;

  @Column()
  nickname!: string;

  @Column()
  room!: string;

  @Column('text')
  text!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
