# Guardião Nacional - Painel Administrativo

![Status](https://img.shields.io/badge/status-active-success.svg)
![URL](https://img.shields.io/badge/url-painel.guardiaonacional.com-red)
![Stack](https://img.shields.io/badge/stack-React%20v19-blue)

Painel de administração exclusivo servido em `painel.guardiaonacional.com`. Permite o gerenciamento de ocorrências e serviços municipais.

## 🏗️ Arquitetura e Fluxo

```mermaid
graph TD
    Admin((Gestor)) -->|Login| Auth[Auth System]
    Auth -->|Role Check| Hub[Role Hub]
    
    Hub -->|Super Admin| Global[Dashboard Geral]
    Hub -->|Prefeito| City[Dashboard Municipal]
    Hub -->|Servidor| Task[Kanban de Tarefas]
    
    subgraph "Core Admin Features"
        Global --> Analytics[Métricas Firestore]
        City --> Map[Mapa de Calor]
        City --> CRM[Gestão de Secretarias]
        Task --> Update[Status de Ocorrências]
    end
    
    subgraph "Intelligence"
        Global --> WarRoom[Sala de Guerra]
        WarRoom --> Risk[Análise de Risco IA]
        WarRoom --> Network[Grafo de Conexões]
    end
```

## 🚀 Funcionalidades Principais

### Gestão e Monitoramento
- **Multi-nível**: Brasil > Estado > Município.
- **Kanban**: Gestão visual de ocorrências (A Fazer, Em Andamento, Concluído).
- **CRM**: Gestão de servidores e secretarias municipais.

### Inteligência (Sala de Guerra)
- **Análise de Risco**: Monitoramento de estabilidade política via IA.
- **Grafo de Conexões**: Visualização de relacionamento entre entidades.
- **Ingestão Graal (Upload Seguro)**: Recepção massiva SysAdmin de arquivos `.graal` para upload assíncrono de contribuições de zona cega (Calamidade sem internet) utilizando Cloud Functions validadoras.

### Controle do Sistema
- **Notificações em Massa (Emergency)**: Interface do Message Composer com Switch nativa geradora de pacotes tipo "Emergência" para CEPs e cidadãos afetados.
- **Mensageria Multicanal**: Envio de e-mails profissionais via Brevo, push notifications e SMS com segmentação geográfica avançada.
- **Listas Manuais**: Envio exclusivo para emails/SMS inseridos manualmente com modo exclusivo (ignora filtros do app).
- **Webhooks**: Integração com sistemas externos (CRM, ERPs Municipais).
- **Security Rules 2.0**: Controle granular de acesso por nível de cidade e função.
- **Insights Preditivos**: Alertas automáticos de "Hotspots" e tendências de problemas.
- **Auto-Moderação**: Filtros de IA para conteúdo impróprio com limiar de auto-publicação otimizado (Risco ≤ 3).
- **Auditoria**: Logs detalhados de ações administrativas.
- **Dashboard Estratégico**: Visão nacional com métricas de aprovação, resolução e tendências temporais.
- **Otimização de Heatmap**: Novo motor de renderização no IntelligenceMap com limite de 2000 pontos e ajuste dinâmico de intensidade para hotspots.

### Monetização & Anúncios
- **Painel de Monetização**: Configuração centralizada de AdMob (mobile) e AdSense (desktop).
- **Livro dos Guardiões**: CRUD de usuários isentos de anúncios (UID/Email, motivo, prazo em dias).
- **Cidades Assinantes**: Gestão de prefeituras parceiras com isenção geográfica e prazos configuráveis.
- **Controle Municipal**: Override de anúncios por cidade com toggle individual.
- **Relatórios de Receita**: Histórico de extratos de monetização por plataforma.

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 19, Vite 5, TypeScript |
| **Estilização** | Tailwind CSS v4, Shadcn/UI |
| **Gráficos** | Recharts, React Force Graph |
| **Backend** | Firebase (Auth, Firestore, Hosting, Functions) |
| **Email** | Brevo (Sendinblue) via firestore-send-email Extension |
| **Testes** | Playwright (E2E), Vitest (Unit) |

## 📦 Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/manuelportelaneto/procuradoria-cidada-painel.git

# 2. Instale dependências
npm install

# 3. Configure .env
cp .env.example .env

# 4. Inicie
npm run dev
```

## 🧪 Testes

O projeto possui cobertura de testes unitários e E2E.

```bash
# Unitários
npm run test

# Segurança
npm run test:security

# E2E (Playwright)
npm run test:e2e
```

## 🔄 Últimas Atualizações (Março 2026)

- **Mensageria**: Integração Brevo com envio de e-mails profissionais e listas manuais com modo exclusivo.
- **Livro dos Guardiões**: Aba completa para gestão de isenção de anúncios por UID/Email com prazo.
- **Cidades Assinantes**: Aba de gestão de prefeituras parceiras com prazos e status.
- **Monetização**: Painel com 4 abas (Configurações, Guardiões, Cidades, Extratos).
- **Segmentação**: Filtros geográficos avançados no Message Composer (estados, cidades, bairros, CEP).

---
**Desenvolvido por Cloud Matrix**
