#!/usr/bin/env bash
# ==============================================================================
# Script de Automação de Testes do Guardião Painel
# Executa testes unitários, testes de integração, auditoria e compilação
# ==============================================================================

set -e

echo "🚀 [1/3] Executando Suíte de Testes Unitários e Integração (Vitest)..."
npm run test:run

echo "🔍 [2/3] Validando Tipos e Compilação de Produção..."
npm run build:prod

echo "✅ [3/3] Todos os testes passaram e o painel foi compilado com 100% de sucesso!"
