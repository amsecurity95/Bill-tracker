import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  health() {
    return this.aiService.health();
  }

  @Post('chat')
  chat(@Body() chatDto: ChatDto) {
    return this.aiService.chat(chatDto);
  }
}

