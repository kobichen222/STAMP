/** E-mail: SMTP (the studio's own mailbox) is used when configured, before Resend. */
import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn(async () => ({}));
const createTransport = vi.fn(() => ({ sendMail: sendMailMock }));
vi.mock('nodemailer', () => ({ default: { createTransport }, createTransport }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sendMailMock.mockClear();
  createTransport.mockClear();
});

describe('sendMail', () => {
  it('sends through SMTP when SMTP_* is set', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.stamp2go.co.il');
    vi.stubEnv('SMTP_USER', 'orders@stamp2go.co.il');
    vi.stubEnv('SMTP_PASS', 'x');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: ['a@b.co'], subject: 'בדיקה', html: '<b>hi</b>', attachments: [{ filename: 'f.pdf', content: Buffer.from('x') }] });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'mail.stamp2go.co.il', port: 465, secure: true }));
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ from: 'Stamp2Go <orders@stamp2go.co.il>', to: ['a@b.co'], subject: 'בדיקה' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses STARTTLS on port 587', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.example.com');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'u@example.com');
    vi.stubEnv('SMTP_PASS', 'x');
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: ['a@b.co'], subject: 's', html: 'h' });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 587, secure: false }));
  });
});
