import { JalaliDatePipe } from './jalali-date.pipe';

describe('JalaliDatePipe', () => {
  let pipe: JalaliDatePipe;

  beforeEach(() => {
    pipe = new JalaliDatePipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format date to Persian Jalali format', () => {
    const testDate = '2026-09-16T00:00:00.000Z';
    const formatted = pipe.transform(testDate);
    expect(formatted).toBeTruthy();
    expect(formatted).not.toBe('---');
    // 2026-09-16 correspond to 1405/06/25 in Jalali
    expect(formatted).toContain('۱۴۰۵');
  });

  it('should return --- for null or invalid date', () => {
    expect(pipe.transform(null)).toBe('---');
    expect(pipe.transform(undefined)).toBe('---');
    expect(pipe.transform('invalid-date')).toBe('---');
  });
});
