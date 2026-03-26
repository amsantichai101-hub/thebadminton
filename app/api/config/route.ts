export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
export async function POST(req: Request) { const body = await req.json(); if (body.action==='auth') { const pin = process.env.ADMIN_PIN || 'kpmgadmin'; return NextResponse.json({ ok: String(body.pin)===String(pin) }) } if (body.action==='set') { await supabaseAdmin.from('system_config').upsert({ key: body.key, value: String(body.value) }); return NextResponse.json({ ok: true }) } return NextResponse.json({ ok: false }) }
