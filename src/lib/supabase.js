import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('[Nexus Debug] SUPABASE_URL:', supabaseUrl || 'VACÍA')
console.log('[Nexus Debug] ANON_KEY presente:', supabaseAnonKey ? 'SÍ' : 'NO')
console.log('[Nexus Debug] ANON_KEY empieza con eyJ...:', supabaseAnonKey.startsWith('eyJ'))
console.log('[Nexus Debug] ANON_KEY longitud:', supabaseAnonKey.length)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
