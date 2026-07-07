import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// 1. Client สำหรับฝั่งผู้ใช้งาน (Browser/Frontend)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

// ให้ page.tsx เรียกใช้งานตัวนี้ได้เลย
export const supabase = supabaseAnon; 

// 2. Client สำหรับฝั่งระบบหลังบ้าน (API/Server)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// เช็คว่ามี serviceRoleKey หรือไม่ (เพื่อป้องกันการ Error บน Browser)
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null as any;