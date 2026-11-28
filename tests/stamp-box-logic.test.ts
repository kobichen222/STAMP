/** The home box's pure logic: the status line wording, the turn queue, and when Enter sends. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enterSends, statusLine, takeJobs, type Job } from '@/components/home/stamp-box-logic';

describe('status line under the box', () => {
  const line = (splitting: boolean, total: number, ready: number, slow = false) => statusLine({ splitting, total, ready, slow });

  it('says the message is being cut while the split runs', () => {
    expect(line(true, 0, 0)).toBe('מכינים את החותמות…');
    expect(line(true, 2, 1)).toBe('מכינים את החותמות…');
  });
  it('one stamp', () => {
    expect(line(false, 1, 0)).toBe('מכינים את החותמת…');
  });
  it('several stamps: the count until the first is done, then how many are ready', () => {
    expect(line(false, 3, 0)).toBe('מכינים 3 חותמות');
    expect(line(false, 3, 1)).toBe('1 מתוך 3 מוכנות');
    expect(line(false, 3, 2)).toBe('2 מתוך 3 מוכנות');
  });
  it('adds that it takes longer than usual once the run is slow', () => {
    expect(line(true, 0, 0, true)).toBe('מכינים את החותמות… · לוקח יותר מהרגיל');
    expect(line(false, 1, 0, true)).toBe('מכינים את החותמת… · לוקח יותר מהרגיל');
    expect(line(false, 4, 0, true)).toBe('מכינים 4 חותמות · לוקח יותר מהרגיל');
    expect(line(false, 4, 3, true)).toBe('3 מתוך 4 מוכנות · לוקח יותר מהרגיל');
  });
  it('no line when there is nothing to make', () => {
    expect(line(false, 0, 0)).toBe('');
    expect(line(false, 0, 0, true)).toBe('');
  });
});

describe('turn queue', () => {
  const job = (id: string): Job => ({ id, msgs: [{ role: 'user', text: id }] });
  const all = () => true;

  it('starts up to the limit in order and keeps the rest waiting', () => {
    const { start, rest } = takeJobs([job('1'), job('2'), job('3'), job('4')], 0, 3, all);
    expect(start.map((j) => j.id)).toEqual(['1', '2', '3']);
    expect(rest.map((j) => j.id)).toEqual(['4']);
  });
  it('counts the jobs already running', () => {
    const { start, rest } = takeJobs([job('4'), job('5')], 2, 3, all);
    expect(start.map((j) => j.id)).toEqual(['4']);
    expect(rest.map((j) => j.id)).toEqual(['5']);
    expect(takeJobs([job('6')], 3, 3, all).start).toEqual([]);
  });
  it('drops the jobs of removed cards without using a place', () => {
    const { start, rest } = takeJobs([job('1'), job('2'), job('3')], 1, 3, (id) => id !== '1');
    expect(start.map((j) => j.id)).toEqual(['2', '3']);
    expect(rest).toEqual([]);
  });
});

describe('Enter in the box', () => {
  afterEach(() => vi.unstubAllGlobals());
  const touchPhone = (on: boolean) =>
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: on && q === '(hover: none) and (pointer: coarse)' }) });
  const key = (k: string, shiftKey = false, isComposing = false) => ({ key: k, shiftKey, nativeEvent: { isComposing } });

  it('sends on a computer; Shift+Enter and IME composition do not', () => {
    touchPhone(false);
    expect(enterSends(key('Enter'))).toBe(true);
    expect(enterSends(key('Enter', true))).toBe(false);
    expect(enterSends(key('Enter', false, true))).toBe(false);
    expect(enterSends(key('a'))).toBe(false);
  });
  it('never sends on a touch phone: only the arrow does', () => {
    touchPhone(true);
    expect(enterSends(key('Enter'))).toBe(false);
  });
});
