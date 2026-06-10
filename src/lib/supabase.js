import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
  || 'https://tbfrwnfajrcpimhflmhv.supabase.co'

const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_IGLCtorummVDKrkyRC3fhQ_43kDPgLF'

export const supabase = createClient(url, key)
