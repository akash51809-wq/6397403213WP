const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectPostgres, SessionAuth, User, Contact, IncomingMessage, MessageReport, ApiSettings } = require('../db');
const { usePgAuthState, encryptPayload } = require('../pgAuthState');

const BufferJSON = {
  replacer: (k, v) => (Buffer.isBuffer(v) ? { type: 'Buffer', data: v.toString('base64') } : v),
  reviver: (k, v) => (v && typeof v === 'object' && v.type === 'Buffer' ? Buffer.from(v.data, 'base64') : v),
};

async function migrateToPostgres() {
  const dbUri = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUri) {
    throw new Error('DATABASE_URL is required to run migration.');
  }

  const encryptionKey = process.env.SESSION_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.trim().length < 16) {
    throw new Error('SESSION_ENCRYPTION_KEY (min 16 chars) is required.');
  }

  console.log('[Migration] Connecting to PostgreSQL...');
  await connectPostgres(dbUri);
  console.log('[Migration] PostgreSQL Connected.');

  // 1. Migrate auth_info files if present
  const authDir = path.join(__dirname, '..', 'auth_info');
  if (fs.existsSync(authDir)) {
    const credsFile = path.join(authDir, 'creds.json');
    if (fs.existsSync(credsFile)) {
      const files = fs.readdirSync(authDir).filter(f => f.endsWith('.json'));
      console.log(`[Migration] Found ${files.length} JSON auth files in auth_info/ to migrate.`);

      let count = 0;
      for (const file of files) {
        try {
          const filePath = path.join(authDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw, BufferJSON.reviver);
          const jsonString = JSON.stringify(data, BufferJSON.replacer);
          const encryptedRecord = encryptPayload(jsonString);
          const key = `admin_${file}`;

          await SessionAuth.findOneAndUpdate(
            { id: key },
            { data: encryptedRecord },
            { upsert: true }
          );
          count++;
        } catch (err) {
          console.warn(`[Migration] Auth file ${file} warning:`, err.message);
        }
      }
      console.log(`[Migration] Migrated ${count} auth files to session_auth table.`);
    }
  }

  // 2. Migrate message_reports.json if present
  const reportsFile = path.join(__dirname, '..', 'message_reports.json');
  if (fs.existsSync(reportsFile)) {
    try {
      const reports = JSON.parse(fs.readFileSync(reportsFile, 'utf-8') || '[]');
      if (reports.length > 0) {
        const ops = reports.filter(r => r && r.id).map(r => ({
          updateOne: {
            filter: { id: r.id },
            update: { $set: r },
            upsert: true
          }
        }));
        await MessageReport.bulkWrite(ops);
        console.log(`[Migration] Migrated ${reports.length} message reports to PostgreSQL.`);
      }
    } catch (e) {
      console.warn('[Migration] Reports migration warning:', e.message);
    }
  }

  // 3. Migrate contacts_store.json if present
  const contactsFile = path.join(__dirname, '..', 'contacts_store.json');
  if (fs.existsSync(contactsFile)) {
    try {
      const contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf-8') || '[]');
      if (contacts.length > 0) {
        const ops = contacts.filter(c => c && c.id).map(c => ({
          updateOne: {
            filter: { id: c.id },
            update: { $set: c },
            upsert: true
          }
        }));
        await Contact.bulkWrite(ops);
        console.log(`[Migration] Migrated ${contacts.length} contacts to PostgreSQL.`);
      }
    } catch (e) {
      console.warn('[Migration] Contacts migration warning:', e.message);
    }
  }

  // 4. Migrate incoming_messages.json if present
  const incomingFile = path.join(__dirname, '..', 'incoming_messages.json');
  if (fs.existsSync(incomingFile)) {
    try {
      const msgs = JSON.parse(fs.readFileSync(incomingFile, 'utf-8') || '[]');
      if (msgs.length > 0) {
        const ops = msgs.filter(m => m && m.id).map(m => ({
          updateOne: {
            filter: { id: m.id },
            update: { $set: m },
            upsert: true
          }
        }));
        await IncomingMessage.bulkWrite(ops);
        console.log(`[Migration] Migrated ${msgs.length} incoming messages to PostgreSQL.`);
      }
    } catch (e) {
      console.warn('[Migration] Incoming messages migration warning:', e.message);
    }
  }

  console.log('[Migration] PostgreSQL data migration completed successfully.');
}

if (require.main === module) {
  migrateToPostgres()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration] Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { migrateToPostgres };
