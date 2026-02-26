import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Giriş yap (LDAP veya yerel)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yerel hesap oluştur (LDAP kapalıyken)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Giriş yapmış kullanıcı bilgilerini getir' })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('ldap/sync')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'LDAP kullanıcılarını veritabanına senkronize et' })
  syncLdap() {
    return this.authService.syncLdapUsers();
  }

  @Get('ldap/search')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'LDAP kullanıcı arama (autocomplete)' })
  searchLdap(@Query('q') query: string) {
    return this.authService.searchLdapUsers(query || '');
  }
}
