import { supabase } from '../supabaseClient';

export type AssertionResult = { name: string; status: 'pass' | 'fail'; detail?: string };

const check = async (name: string, promise: any, results: AssertionResult[]) => {
  try {
    const { data, error } = await promise;
    if (error) {
      const msg = String(error.message || error);
      const lc = msg.toLowerCase();
      const isAuth = lc.includes('permission') || lc.includes('not authorized') || error?.code === 'PGRST301' || error?.status === 401;
      results.push({ name, status: isAuth ? 'pass' : 'fail', detail: msg });
      return;
    }
    if (Array.isArray(data) && data.length > 0) {
      results.push({ name, status: 'fail', detail: 'Unexpected rows visible' });
    } else {
      results.push({ name, status: 'pass' });
    }
  } catch (e: any) {
    results.push({ name, status: 'fail', detail: e?.message || String(e) });
  }
};

export const runRLSAssertions = async (userId: string): Promise<AssertionResult[]> => {
  const results: AssertionResult[] = [];
  await check('profiles', supabase.from('profiles').select('id').not('id', 'eq', userId).limit(1), results);
  await check('plants', supabase.from('plants').select('id').not('owner_id', 'eq', userId).limit(1), results);
  await check('logs', supabase.from('logs').select('id').not('owner_id', 'eq', userId).limit(1), results);
  await check('gardens', supabase.from('gardens').select('id').not('owner_id', 'eq', userId).limit(1), results);
  await check('notebook_entries', supabase.from('notebook_entries').select('id').not('owner_id', 'eq', userId).limit(1), results);
  if (results.some(r => r.status === 'fail')) {
    console.error('Security Policy Misconfiguration', results);
  }
  return results;
};
