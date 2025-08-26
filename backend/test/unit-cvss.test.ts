import { computeCvss } from '../src/lib/cvss';

describe('cvss helper', () => {
  it('computes score for valid vector', async () => {
    const score = await computeCvss('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
    expect(score).toBeGreaterThan(0);
  });
  it('rejects invalid vector', async () => {
    await expect(computeCvss('INVALID')).rejects.toThrow();
  });
});
