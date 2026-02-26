import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';

export interface LdapUser {
  sAMAccountName: string;
  mail?: string;
  displayName?: string;
  givenName?: string;
  sn?: string;
  department?: string;
  memberOf?: string[];
  dn: string;
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private config: ConfigService) {}

  private get isEnabled(): boolean {
    return this.config.get<boolean>('ldap.enabled');
  }

  private createClient(): Client {
    return new Client({
      url: this.config.get<string>('ldap.host'),
      timeout: 5000,
      connectTimeout: 5000,
    });
  }

  /**
   * Kullanıcı adı ve şifre ile LDAP kimlik doğrulaması yapar.
   * Başarılı olursa kullanıcı bilgilerini döner, başarısız olursa null.
   */
  async authenticate(username: string, password: string): Promise<LdapUser | null> {
    if (!this.isEnabled) return null;

    const client = this.createClient();
    try {
      // Önce service account ile bağlan, kullanıcının DN'ini bul
      const bindDn = this.config.get<string>('ldap.bindDn');
      const bindPw = this.config.get<string>('ldap.bindPassword');
      await client.bind(bindDn, bindPw);

      const baseDn = this.config.get<string>('ldap.baseDn');
      const userFilter = this.config.get<string>('ldap.userFilter').replace('{{username}}', username);

      const { searchEntries } = await client.search(baseDn, {
        filter: userFilter,
        attributes: ['dn', 'sAMAccountName', 'mail', 'displayName', 'givenName', 'sn', 'department', 'memberOf'],
        scope: 'sub',
      });

      if (!searchEntries.length) {
        this.logger.debug(`LDAP: kullanıcı bulunamadı: ${username}`);
        return null;
      }

      const entry = searchEntries[0];
      const userDn = entry.dn;

      // Kullanıcı kendi şifresiyle bind et
      await client.bind(userDn, password);

      return this.mapEntry(entry);
    } catch (err) {
      this.logger.debug(`LDAP authenticate başarısız: ${err.message}`);
      return null;
    } finally {
      await client.unbind();
    }
  }

  /**
   * Tüm LDAP kullanıcılarını döner (sync için).
   */
  async getAllUsers(): Promise<LdapUser[]> {
    if (!this.isEnabled) return [];

    const client = this.createClient();
    try {
      const bindDn = this.config.get<string>('ldap.bindDn');
      const bindPw = this.config.get<string>('ldap.bindPassword');
      await client.bind(bindDn, bindPw);

      const searchBase = this.config.get<string>('ldap.userSearchBase') ||
        this.config.get<string>('ldap.baseDn');

      const { searchEntries } = await client.search(searchBase, {
        filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))',
        attributes: ['dn', 'sAMAccountName', 'mail', 'displayName', 'givenName', 'sn', 'department', 'memberOf'],
        scope: 'sub',
        sizeLimit: 1000,
      });

      return searchEntries.map(this.mapEntry);
    } catch (err) {
      this.logger.error(`LDAP getAllUsers başarısız: ${err.message}`);
      return [];
    } finally {
      await client.unbind();
    }
  }

  /**
   * Kullanıcı arama (autocomplete için).
   */
  async searchUsers(query: string): Promise<LdapUser[]> {
    if (!this.isEnabled) return [];

    const client = this.createClient();
    try {
      const bindDn = this.config.get<string>('ldap.bindDn');
      const bindPw = this.config.get<string>('ldap.bindPassword');
      await client.bind(bindDn, bindPw);

      const baseDn = this.config.get<string>('ldap.baseDn');
      const filter = `(&(objectClass=user)(|(displayName=*${query}*)(mail=*${query}*)(sAMAccountName=*${query}*)))`;

      const { searchEntries } = await client.search(baseDn, {
        filter,
        attributes: ['dn', 'sAMAccountName', 'mail', 'displayName', 'department'],
        scope: 'sub',
        sizeLimit: 20,
      });

      return searchEntries.map(this.mapEntry);
    } catch (err) {
      this.logger.error(`LDAP searchUsers başarısız: ${err.message}`);
      return [];
    } finally {
      await client.unbind();
    }
  }

  /**
   * Kullanıcının admin grubunda olup olmadığını kontrol eder.
   */
  isAdminByGroups(memberOf: string[]): boolean {
    const adminGroup = this.config.get<string>('ldap.groupAdmin');
    if (!adminGroup || !memberOf) return false;
    return memberOf.some((g) => g.toLowerCase() === adminGroup.toLowerCase());
  }

  private mapEntry(entry: any): LdapUser {
    return {
      dn: entry.dn,
      sAMAccountName: String(entry.sAMAccountName || ''),
      mail: entry.mail ? String(entry.mail) : undefined,
      displayName: entry.displayName ? String(entry.displayName) : undefined,
      givenName: entry.givenName ? String(entry.givenName) : undefined,
      sn: entry.sn ? String(entry.sn) : undefined,
      department: entry.department ? String(entry.department) : undefined,
      memberOf: entry.memberOf
        ? Array.isArray(entry.memberOf)
          ? entry.memberOf.map(String)
          : [String(entry.memberOf)]
        : [],
    };
  }
}
