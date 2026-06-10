import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty } from 'class-validator';

class AuthDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() dto: AuthDto) {
    await this.authService.signUp(dto.username, dto.password);
    // Auto login after registration to satisfy "auto-connect" requirement
    return this.authService.signIn(dto.username, dto.password);
  }

  @Post('login')
  async login(@Body() dto: AuthDto) {
    return this.authService.signIn(dto.username, dto.password);
  }
}
