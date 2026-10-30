// ══════════════════════════════════════════════════════════
//  FRÍO CARS — services/groq.js
//  Groq retira modelos con frecuencia; si el configurado ya no
//  existe, se pide la lista de modelos disponibles y se usa otro.
// ══════════════════════════════════════════════════════════

import 'dotenv/config';

const GROQ_URL = 'https://api.groq.com/openai/v1';
const MODELOS_PREFERIDOS = [
  process.env.GROQ_MODEL,
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
].filter(Boolean);

let modeloActivo = MODELOS_PREFERIDOS[0];

async function modelosDisponibles() {
  const r = await fetch(`${GROQ_URL}/models`, {
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
  });
  const data = await r.json();
  return (data.data || [])
    .filter(m => m.active !== false)
    .map(m => m.id)
    // Solo modelos de chat (descarta whisper, tts, guard, etc.)
    .filter(id => !/whisper|tts|guard|prompt|orpheus|playai|compound/i.test(id));
}

async function llamarGroq(mensajes, modelo, opciones) {
  const r = await fetch(`${GROQ_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensajes,
      max_tokens: opciones.max_tokens ?? 800,
      temperature: opciones.temperature ?? 0.4
    })
  });
  return r.json();
}

// Devuelve la respuesta cruda de Groq ({ choices } o { error })
export async function chatGroq(mensajes, opciones = {}) {
  if (!process.env.GROQ_API_KEY) {
    return { error: { message: 'Falta configurar GROQ_API_KEY en el servidor.' } };
  }

  let data = await llamarGroq(mensajes, modeloActivo, opciones);
  const errorModelo = data.error && /model|decommission|does not exist|access/i.test(data.error.message || '');
  if (!errorModelo) return data;

  console.warn(`Modelo Groq "${modeloActivo}" no disponible: ${data.error.message}`);
  const disponibles = await modelosDisponibles();
  const candidatos = [
    ...MODELOS_PREFERIDOS.filter(m => disponibles.includes(m)),
    ...disponibles,
  ].filter(m => m !== modeloActivo);

  for (const modelo of candidatos) {
    data = await llamarGroq(mensajes, modelo, opciones);
    if (!data.error) {
      console.log(`Usando modelo Groq: ${modelo}`);
      modeloActivo = modelo;
      return data;
    }
  }
  return data;
}
