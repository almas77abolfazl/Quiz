import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/core/auth/auth.module';
import { ChatGateway } from './chat.getaway';
import { ChatService } from './chat.service';
import { Message, MessageSchema } from './schema/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    AuthModule,
  ],
  controllers: [],
  providers: [ChatGateway, ChatService],
  exports: [],
})
export class ChatModule {}
