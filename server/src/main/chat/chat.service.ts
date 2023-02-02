import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './schema/message.schema';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';
import { parse } from 'cookie';
import { WsException } from '@nestjs/websockets';
import { AuthService } from 'src/core/auth/auth.service';
import { User } from 'src/core/user/user.schema';

@Injectable()
export class ChatService {
  constructor(
    private readonly authenticationService: AuthService,
    @InjectModel(Message.name) private readonly model: Model<MessageDocument>,
  ) {}

  async saveMessage(content: string, author: User) {
    const newMessage = {} as Message;
    newMessage.content = content;
    newMessage.author = author;
    await new this.model(newMessage).save();
    return newMessage;
  }

  async getAllMessages() {
    return this.model.find({
      relations: ['author'],
    });
  }

  async getUserFromSocket(socket: Socket) {
    const cookie = socket.handshake.headers.cookie;
    const { Authentication: authenticationToken } = parse(cookie);
    const user =
      await this.authenticationService.getUserFromAuthenticationToken(
        authenticationToken,
      );
    if (!user) {
      throw new WsException('Invalid credentials.');
    }
    return user;
  }
}
