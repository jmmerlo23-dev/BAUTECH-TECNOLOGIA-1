// Archivo: config.js
// Conexión de tu web con la base de datos Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://bjrsuxmtgbzdypztidtv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcnN1eG10Z2J6ZHlwenRpZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTA0MzcsImV4cCI6MjA3NjE4NjQzN30.cnys7aCo370YLbR3npg17pgW-n2IPwN_ZDhkunO0SgM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)