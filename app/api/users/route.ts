import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'İcazəsiz giriş' }, { status: 401 })
    }

    // Admin yoxlaması
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'admin') {
      return NextResponse.json({ error: 'Yalnız adminlər istifadəçi yarada bilər' }, { status: 403 })
    }

    const { ad_soyad, email, password, rol } = await request.json()

    if (!ad_soyad || !email || !password) {
      return NextResponse.json({ error: 'Bütün sahələr tələb olunur' }, { status: 400 })
    }

    // Admin client ilə istifadəçi yarat
    const adminSupabase = await createAdminClient()

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { ad_soyad, rol: rol || 'user' },
    })

    if (createError) {
      if (createError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Bu e-poçt artıq qeydiyyatdadır' }, { status: 400 })
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Profili yenilə (rol üçün)
    if (newUser.user) {
      await adminSupabase
        .from('profiles')
        .update({ rol: rol || 'user', ad_soyad })
        .eq('id', newUser.user.id)
    }

    return NextResponse.json({ data: newUser.user, error: null })
  } catch (err) {
    console.error('User creation error:', err)
    return NextResponse.json({ error: 'Server xətası baş verdi' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'İcazəsiz giriş' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'admin') {
      return NextResponse.json({ error: 'İcazə yoxdur' }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('yaradilib', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: users })
  } catch (err) {
    return NextResponse.json({ error: 'Server xətası' }, { status: 500 })
  }
}
