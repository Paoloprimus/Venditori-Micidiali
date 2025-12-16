/**
 * API: Notifica Feedback Tester via Email
 * 
 * Invia una email a info@reping.it quando un tester invia feedback
 * Usa Web3Forms per l'invio (stesso servizio delle candidature Beta)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

const WEB3FORMS_KEY = '0f7cea16-e0ed-4735-969f-aacbcc65595d';
const NOTIFY_EMAIL = 'info@reping.it';

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Verifica autenticazione
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = await req.json();
    const { category, note, pageUrl, pageTitle } = body;

    if (!category || !note) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }

    // Ottieni info utente
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const userName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Tester'
      : 'Tester';

    const categoryEmoji = category === 'bug' ? '🐛 BUG' : '💡 MIGLIORAMENTO';
    const priorityColor = category === 'bug' ? '🔴' : '🟡';

    // Invia email via Web3Forms
    const emailResponse = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `${priorityColor} REPING Feedback: ${categoryEmoji}`,
        from_name: 'REPING Feedback Bot',
        to: NOTIFY_EMAIL,
        message: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${categoryEmoji} - Nuovo Feedback REPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Tester: ${userName}
📧 Email: ${user.email}
📅 Data: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}

📍 Pagina: ${pageTitle || 'N/A'}
🔗 URL: ${pageUrl || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 MESSAGGIO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${note}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Azioni rapide:
• Dashboard: https://reping.app/admin/feedback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `.trim(),
      }),
    });

    if (!emailResponse.ok) {
      console.error('[Feedback Notify] Web3Forms error:', await emailResponse.text());
      // Non blocchiamo il salvataggio se l'email fallisce
      return NextResponse.json({ success: true, emailSent: false });
    }

    return NextResponse.json({ success: true, emailSent: true });

  } catch (error) {
    console.error('[Feedback Notify] Error:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
