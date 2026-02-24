import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class UiController {
  @Get()
  root(@Res() res: Response) {
    return res.redirect('/chat');
  }

  @Get('chat')
  chatPage(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'chat.html'));
  }
}

