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
    const cookie = socket.handshake.headers.cookie || 'hhh';
    const { Authentication: authenticationToken } = parse(cookie);
    const user =
      await this.authenticationService.getUserFromAuthenticationToken(
        authenticationToken ??
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2M2QyYTE2MzUyMzUzYzQxYjg1NmNiMTMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJkZWZhdWx0QGVtYWlsLmNvbSIsInJvbGUiOiJzYSIsImNyZWF0ZWRBdCI6IjIwMjMtMDEtMjZUMTU6NTA6NTkuNzcwWiIsInVwZGF0ZWRBdCI6IjIwMjMtMDItMDZUMTc6NDM6NDEuMTA1WiIsImFkZHJlc3MiOiLYtNmH2LHYs9iq2KfZhiDYqNmH2KfYsdiz2KrYp9mG2Iwg2LTZh9ixINqv2YTYs9iq2KfZhtiMINiu24zYp9io2KfZhiDZgtio2KfYr9uM2Iwg2qnZiNqG2Ycg2KjZhtmB2LTZhyA02Iwg2b7ZhNin2qkgNDTYjCDZiNin2K3YryAyINuM2KcgMSIsImZpcnN0TmFtZSI6Itin2KjZiNin2YTZgdi22YQiLCJnZW5kZXIiOiJtYWxlIiwibGFzdE5hbWUiOiLZhti124zYsduMINin2YTZhdin2LMiLCJpYXQiOjE2NzU3MDc0ODcsImV4cCI6MTY3NTcwODM4N30.JupDeTYIaXSVcueAf_EVMY9olkZisE0CaXe5DYp37DQ',
      );
    if (!user) {
      throw new WsException('Invalid credentials.');
    }
    return user;
  }
}
