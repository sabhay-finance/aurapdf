import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Prepares the Prisma schema and client for the target environment.
 * - PostgreSQL when deployed to cloud/Vercel (Neon, Supabase, RDS, etc.)
 * - SQLite when developing locally with a local dev.db file
 */
function prepareDatabase() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ prisma/schema.prisma not found.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL || '';
  const isPostgres =
    databaseUrl.startsWith('postgres://') ||
    databaseUrl.startsWith('postgresql://') ||
    process.env.PRISMA_PROVIDER === 'postgresql';

  const targetProvider = isPostgres ? 'postgresql' : 'sqlite';
  console.log(`\n📦 Preparing Prisma Database Provider: [${targetProvider.toUpperCase()}]`);

  let schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Replace provider in datasource block
  const updatedSchema = schemaContent.replace(
    /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*["'](sqlite|postgresql)["']/i,
    (match, currentProvider) => {
      if (currentProvider !== targetProvider) {
        console.log(`   🔄 Updating provider from '${currentProvider}' to '${targetProvider}'`);
      }
      return match.replace(currentProvider, targetProvider);
    }
  );

  fs.writeFileSync(schemaPath, updatedSchema, 'utf8');

  // Run prisma generate
  console.log('   ⚙️  Generating Prisma Client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log(`✅ Prisma Client successfully generated for [${targetProvider.toUpperCase()}].\n`);
  } catch (err: any) {
    console.error('❌ Failed to generate Prisma Client:', err.message);
    process.exit(1);
  }
}

prepareDatabase();
