/** sendMail: an optional plain-text part reaches both transports; without it the message is sent as before. */
import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn(async (_m: Record<string, unknown>) => ({}));
const createTransport = vi.fn(() => ({ sendMail: sendMailMock }));
vi.mock('nodemailer', () => ({ default: { createTransport }, createTransport }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sendMailMock.mockClear();
  createTransport.mockClear();
});

const smtp = () => {
  vi.stubEnv('SMTP_HOST', 'mail.example.com');
  vi.stubEnv('SMTP_USER', 'u@example.com');
  vi.stubEnv('SMTP_PASS', 'x');
};
const resend = () => {
  vi.stubEnv('SMTP_HOST', '');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  const fetchMock = vi.fn(async (_url: string, _init: { body: string }) => new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return () => JSON.parse(fetchMock.mock.calls[0][1].body) as Record<string, unknown>;
};

describe('sendMail text part', () => {
  it('SMTP: passes text with the HTML', async () => {
    smtp();
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: ['a@b.co'], subject: 's', html: '<b>h</b>', text: 'שלום', replyTo: 'r@b.co' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ html: '<b>h</b>', text: 'שלום', replyTo: 'r@b.co' }));
  });

  it('SMTP: no text key without a text part', async () => {
    smtp();
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: ['a@b.co'], subject: 's', html: 'h' });
    expect('text' in sendMailMock.mock.calls[0][0]).toBe(false);
  });

  it('Resend: passes text with the HTML', async () => {
    const body = resend();
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: ['a@b.co'], subject: 's', html: 'h', text: 'שלום', replyTo: 'r@b.co' });
    expect(body()).toEqual(expect.objectContaining({ html: 'h', text: 'שלום', reply_to: 'r@b.co' }));
  });

  it('Resend: no text key without a text part', async () => {
    const body = resend();
    const { sendMail } = await import('@/lib/mail');
    await sendMail({ to: ['a@b.co'], subject: 's', html: 'h' });
    expect('text' in body()).toBe(false);
  });
});
