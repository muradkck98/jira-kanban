import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LdapService } from './ldap.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private ldapService: LdapService,
  ) {}

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const ldapEnabled = this.config.get<boolean>('ldap.enabled');

    let user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (ldapEnabled) {
      // Try LDAP first
      const ldapUser = await this.ldapService.authenticate(dto.username, dto.password);
      if (!ldapUser) {
        throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre.');
      }

      // Upsert the user from LDAP
      const isAdmin = this.ldapService.isAdminByGroups(ldapUser.memberOf || []);

      user = await this.prisma.user.upsert({
        where: { username: ldapUser.sAMAccountName },
        create: {
          username: ldapUser.sAMAccountName,
          email: ldapUser.mail,
          fullName: ldapUser.displayName || ldapUser.sAMAccountName,
          displayName: ldapUser.displayName || ldapUser.sAMAccountName,
          department: ldapUser.department,
          authProvider: 'ldap',
          isActive: true,
          ldapSyncedAt: new Date(),
        },
        update: {
          email: ldapUser.mail,
          fullName: ldapUser.displayName || ldapUser.sAMAccountName,
          displayName: ldapUser.displayName || ldapUser.sAMAccountName,
          department: ldapUser.department,
          ldapSyncedAt: new Date(),
          lastLogin: new Date(),
        },
      });
    } else {
      // Local auth
      if (!user) {
        throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre.');
      }
      if (!user.passwordHash) {
        throw new UnauthorizedException('Bu hesap LDAP ile giriş gerektirir.');
      }
      const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordMatch) {
        throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre.');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız devre dışı bırakılmıştır.');
    }

    const token = this.signToken(user.id, user.username);
    return { token, user: this.sanitizeUser(user) };
  }

  // ─── Register (local only) ──────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const ldapEnabled = this.config.get<boolean>('ldap.enabled');
    if (ldapEnabled) {
      throw new BadRequestException('LDAP aktifken yerel kayıt desteklenmez.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        fullName: dto.fullName,
        displayName: dto.fullName,
        passwordHash,
        authProvider: 'local',
      },
    });

    const token = this.signToken(user.id, user.username);
    return { token, user: this.sanitizeUser(user) };
  }

  // ─── Me ────────────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Kullanıcı bulunamadı.');
    return this.sanitizeUser(user);
  }

  // ─── LDAP Sync ─────────────────────────────────────────────────────────────

  async syncLdapUsers() {
    const ldapUsers = await this.ldapService.getAllUsers();
    this.logger.log(`LDAP sync: ${ldapUsers.length} kullanıcı bulundu.`);

    let created = 0;
    let updated = 0;

    for (const ldapUser of ldapUsers) {
      if (!ldapUser.sAMAccountName) continue;
      const existing = await this.prisma.user.findUnique({
        where: { username: ldapUser.sAMAccountName },
      });

      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            email: ldapUser.mail,
            fullName: ldapUser.displayName || ldapUser.sAMAccountName,
            displayName: ldapUser.displayName || ldapUser.sAMAccountName,
            department: ldapUser.department,
            ldapSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        await this.prisma.user.create({
          data: {
            username: ldapUser.sAMAccountName,
            email: ldapUser.mail,
            fullName: ldapUser.displayName || ldapUser.sAMAccountName,
            displayName: ldapUser.displayName || ldapUser.sAMAccountName,
            department: ldapUser.department,
            authProvider: 'ldap',
            ldapSyncedAt: new Date(),
          },
        });
        created++;
      }
    }

    this.logger.log(`LDAP sync tamamlandı: ${created} oluşturuldu, ${updated} güncellendi.`);
    return { total: ldapUsers.length, created, updated };
  }

  // ─── LDAP User Search ───────────────────────────────────────────────────────

  async searchLdapUsers(query: string) {
    return this.ldapService.searchUsers(query);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private signToken(userId: string, username: string): string {
    return this.jwtService.sign({ sub: userId, username });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
