/**
 * @fileoverview Configuração do Cliente Supabase (`src/services/supabase.ts`).
 *
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Inicializa e exporta o cliente Supabase para uso em todo o painel administrativo.
 * O Supabase é um banco de dados PostgreSQL gerenciado, usado especificamente para
 * os módulos de inteligência estratégica (War Room) que requerem queries SQL complexas.
 *
 * 🏛️ ARQUITETURA DUAL DE BANCO DE DADOS:
 * O sistema Guardião usa dois bancos de dados com propósitos distintos:
 * - **Firestore (Firebase)**: Dados operacionais em tempo real (denúncias, usuários,
 *   automações). Excelente para listeners reativos e escalabilidade horizontal.
 * - **Supabase (PostgreSQL)**: Dados analíticos e de inteligência (relatórios de risco,
 *   grafos de entidades, sinais OSINT). Excelente para joins complexos e aggregations SQL.
 *
 * ⚠️ DEGRADAÇÃO GRACIOSA (Graceful Degradation):
 * Se as variáveis de ambiente `VITE_SUPABASE_URL` ou `VITE_SUPABASE_KEY` não estiverem
 * configuradas (ex: ambiente de dev sem .env), o cliente é criado com credenciais
 * placeholder. Isso previne crash fatal na importação e mantém o restante do painel
 * funcionando — apenas as features de inteligência (War Room) ficam indisponíveis.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Fail gracefully instead of crashing the entire app
if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials missing. Intelligence features will be disabled.');
}

// Create client or a minimal mock that won't crash import
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');
