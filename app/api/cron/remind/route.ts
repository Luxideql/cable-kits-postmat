import { NextRequest, NextResponse } from 'next/server';
import { getEmployees } from '@/lib/data';
import { sendMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const employees = await getEmployees();
  const toNotify = employees.filter(e => e.active && e.notify && e.telegramId);

  await Promise.allSettled(
    toNotify.map(emp =>
      sendMessage(
        emp.telegramId,
        `⏰ <b>Час подати звіт!</b>\n\nРобочий день закінчується — не забудь вказати скільки ти сьогодні зробив.\n\nНатисни <b>➕ Додати виробіток</b>`,
      )
    )
  );

  return NextResponse.json({ sent: toNotify.length, total: employees.length });
}
