import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'SEU_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANONIMA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funções adicionais para bloqueios (opcional, mas incluído para Appointments.tsx)
export async function blockSchedule(startTime: string, endTime: string, reason?: string) {
  const { data, error } = await supabase
    .from('blocked_schedules')
    .insert({ start_time: startTime, end_time: endTime, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getBlockedSchedules() {
  const { data, error } = await supabase
    .from('blocked_schedules')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

export async function isScheduleBlocked(startTime: string, endTime: string) {
  const { data, error } = await supabase
    .from('blocked_schedules')
    .select('*')
    .lte('start_time', endTime)
    .gte('end_time', startTime);
  if (error) throw error;
  return data.length > 0;
}
