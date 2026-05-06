import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
  || 'https://tbfrwnfajrcpimhflmhv.supabase.co'

const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZnJ3bmZhanJjcGltaGZsbWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNDU5MDksImV4cCI6MjA5MzYyMTkwOX0.XU-GZgFES7sFHVHc481eZr7KFNdsk57LijQzoGRw5Io'

export const supabase = createClient(url, key)
