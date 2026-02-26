export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'imar-kanban-secret',
    expireHours: parseInt(process.env.JWT_EXPIRE_HOURS, 10) || 72,
    expiresIn: process.env.JWT_EXPIRES_IN || '72h',
  },

  ldap: {
    enabled: process.env.LDAP_ENABLED === 'true',
    host: process.env.LDAP_HOST || 'ldap://localhost:389',
    baseDn: process.env.LDAP_BASE_DN || 'dc=imar,dc=local',
    bindDn: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    userFilter: process.env.LDAP_USER_FILTER || '(sAMAccountName={{username}})',
    userSearchBase: process.env.LDAP_USER_SEARCH_BASE || '',
    groupAdmin: process.env.LDAP_GROUP_ADMIN || '',
    groupMember: process.env.LDAP_GROUP_MEMBER || '',
    syncCron: process.env.LDAP_SYNC_CRON || '0 2 * * *',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
});
