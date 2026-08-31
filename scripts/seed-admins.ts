/**
 * Create admin accounts. Public signup is disabled (Docs/6 Phase 3), so the
 * first admins are made here with the service-role key.
 *
 *   npm run seed:admins -- --target local  admin@bodhisamadhi.test
 *   dotenv -e .env.hosted -- npm run seed:admins -- --target hosted a@x.com b@y.com
 *
 * Each account is created email-confirmed with a random 20-char password,
 * printed ONCE. Then granted the `admin` role. Re-running for an existing
 * email only ensures the role, leaving the password alone.
 *
 * `--target local` reads the URL + service key from `supabase status`.
 * `--target hosted` reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * from the environment — load them with `dotenv -e .env.hosted`.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const targetIdx = args.indexOf('--target');
const target = targetIdx >= 0 ? args[targetIdx + 1] : 'local';
const emails = args.filter(
  (a, i) => !a.startsWith('--') && i !== targetIdx + 1,
);

if (emails.length === 0) {
  console.error(
    'usage: seed:admins -- --target <local|hosted> <email> [email…]',
  );
  process.exit(1);
}

function config(): { url: string; serviceKey: string } {
  if (target === 'hosted') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error(
        'hosted target needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ' +
          '(run via `dotenv -e .env.hosted -- npm run seed:admins …`)',
      );
    }
    return { url, serviceKey };
  }
  const raw = execFileSync(
    'npx',
    ['--no-install', 'supabase', 'status', '-o', 'json'],
    { encoding: 'utf8' },
  );
  const cfg = JSON.parse(raw) as Record<string, string>;
  return { url: cfg.API_URL, serviceKey: cfg.SERVICE_ROLE_KEY };
}

function password() {
  // 20 chars, satisfies lower_upper_letters_digits.
  return (
    randomBytes(15)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, 'x') + 'aA1'
  ).slice(0, 20);
}

async function main() {
  const { url, serviceKey } = config();
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`target: ${target} (${url})\n`);

  for (const email of emails) {
    const pw = password();
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password: pw,
      email_confirm: true,
    });

    let userId = created?.user?.id;

    if (createErr) {
      if (!/already been registered|already exists/i.test(createErr.message)) {
        throw createErr;
      }
      const { data: list } = await db.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === email)?.id;
      console.log(`  ${email}  — already exists, ensuring role`);
    } else {
      console.log(`  ${email}  — created`);
      console.log(`      password: ${pw}   (change on first sign-in)`);
    }

    if (!userId) throw new Error(`could not resolve a user id for ${email}`);

    const { error: roleErr } = await db
      .from('user_roles')
      .upsert(
        { user_id: userId, role: 'admin' },
        { onConflict: 'user_id,role' },
      );
    if (roleErr) throw roleErr;
    console.log(`      role: admin\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
