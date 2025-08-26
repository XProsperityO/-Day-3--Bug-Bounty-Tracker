// Minimal CVSS v3.1 base score calculation (simplified). For production, replace with vetted library.
type MetricMap = Record<string, number>;
const AV: MetricMap = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC: MetricMap = { L: 0.77, H: 0.44 };
const PRU: MetricMap = { N: 0.85, L: 0.62, H: 0.27 }; // Scope Unchanged
const PRC: MetricMap = { N: 0.85, L: 0.68, H: 0.5 };  // Scope Changed
const UI: MetricMap = { N: 0.85, R: 0.62 };
const CIA: MetricMap = { H: 0.56, L: 0.22, N: 0 };

export async function computeCvss(vector: string): Promise<number> {
  if (!vector.startsWith('CVSS:3.1/')) throw new Error('INVALID_CVSS_VECTOR');
  const parts = Object.fromEntries(vector.split('/').slice(1).map(p => p.split(':') as [string,string]));
  try {
    const sChanged = parts.S === 'C';
    const prMap = sChanged ? PRC : PRU;
    const impactSub = 1 - (1 - CIA[parts.C]) * (1 - CIA[parts.I]) * (1 - CIA[parts.A]);
    const impact = sChanged ? 7.52 * (impactSub - 0.029) - 3.25 * Math.pow(impactSub - 0.02, 15) : 6.42 * impactSub;
    const exploitab = 8.22 * AV[parts.AV] * AC[parts.AC] * prMap[parts.PR] * UI[parts.UI];
    const base = impact <= 0 ? 0 : (sChanged ? 1.08 * (impact + exploitab) : impact + exploitab);
    return Math.min(Math.ceil(base * 10) / 10, 10);
  } catch {
    throw new Error('INVALID_CVSS_VECTOR');
  }
}
