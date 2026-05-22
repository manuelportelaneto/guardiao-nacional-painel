# 📍 Índice do `guardiao-painel` — Guia de Navegação Interna

> **Finalidade:** Painel Web Administrativo React para gestores municipais, prefeitos e administradores do Guardião Nacional.
> 
> **URL em Produção:** `painel.guardiaonacional.com`
> 
> **Tecnologias:** React 19, Vite 5, TypeScript, Tailwind CSS v4, Firebase (Auth, Firestore, Functions)

---

## 🗂️ Árvore de Diretórios e Finalidades

```
guardiao-painel/
├── src/                          # Código-fonte da aplicação
│   ├── App.tsx                   # Orquestrador de rotas e RBAC (controle de acesso por role)
│   ├── main.tsx                  # Ponto de entrada React: monta o app na DOM
│   ├── firebaseConfig.ts         # Inicialização de todos os serviços Firebase + App Check
│   ├── config.ts                 # Configurações globais do painel (ambientes, constantes)
│   ├── context/                  # Estado global da aplicação (Contextos React)
│   ├── services/                 # Camada de dados: Firestore, APIs externas, lógica de negócio
│   ├── hooks/                    # Hooks customizados com TanStack Query
│   ├── components/               # Componentes React da interface
│   ├── stores/                   # Gerenciamento de estado local Zustand (moderação)
│   ├── lib/                      # Configurações de bibliotecas (React Query client)
│   ├── types/                    # Interfaces e tipos TypeScript globais
│   └── test/                     # Setup de testes (Vitest)
├── src/INDEX.md                  # ↳ Guia interno do diretório src/
├── README.md                     # Documentação pública do projeto (stack, funcionalidades, deploy)
├── index.html                    # Template HTML raiz do Vite
├── vite.config.ts                # Configuração do bundler Vite
├── vitest.config.ts              # Configuração dos testes unitários
├── tailwind.config.ts            # Configuração do Tailwind CSS v4
├── tsconfig.app.json             # Configuração do TypeScript para a aplicação
└── package.json                  # Dependências e scripts NPM
```

---

## 🔐 Sistema de Autenticação e Controle de Acesso (RBAC)

O painel usa um sistema de dois fatores de autenticação em cascata:

| Nível | Verificação | Implementação |
|-------|------------|----------------|
| **Auth** | Usuário está logado? | `useAuth().currentUser` via Firebase Auth |
| **Role** | Possui o papel necessário? | `useAuth().userData.role` vs `allowedRoles` da rota |

**Papéis e Acessos:**

| Role | Acesso |
|------|--------|
| `super_admin` | Tudo: painel global, municípios, automações, IA |
| `admin` | Painel global, exceto configurações de sistema críticas |
| `presidente` | Painel global em modo leitura |
| `prefeito` / `city_admin` | Dashboard e CRM do município designado |
| `servidor` / `analista` | Kanban de tarefas do município designado |
| `citizen` | ❌ Bloqueado — tela de "Acesso Restrito" |

---

## 🗺️ Mapa de Rotas

| URL | Componente | Roles Permitidos |
|-----|-----------|-----------------|
| `/` | `AuthScreen` | Público |
| `/hub` | `RoleHub` | Todos os admins |
| `/admin/dashboard` | `AdminOverview` | super_admin, admin, presidente |
| `/admin/moderation` | `AdminModeration` | super_admin, admin |
| `/admin/intelligence` | `IntelligenceMap` | super_admin, admin |
| `/admin/war-room` | `WarRoom` | super_admin, admin |
| `/admin/automations` | `AdminAutomations` | super_admin, admin |
| `/admin/monetization` | `AdminMonetization` | super_admin, admin |
| `/city/select` | `CitySelector` | Todos os admins |
| `/city/:cityId/dashboard` | `CityDashboard` | Todos os admins |
| `/city/:cityId/tasks` | `TasksKanban` | Todos os admins |
| `/city/:cityId/departments` | `DepartmentsCRM` | Todos os admins |

---

## 📡 Fluxo de Dados

```
Componente de Tela
    └── Hook (`useContributions`, etc.) [TanStack Query — cache + loading]
            └── Service (`contributionService`, etc.) [chamadas Firestore/API]
                    └── Firebase Firestore / Cloud Functions
```

O `AuthContext` é um estado global separado, consumido diretamente pelas telas e pelo `PrivateRoute`.

---

## 📂 Guias por Subdiretório

| Diretório | Guia Interno |
|-----------|-------------|
| `src/` | [src/INDEX.md](./src/INDEX.md) |
| `src/context/` | [context/INDEX.md](./src/context/INDEX.md) |
| `src/services/` | [services/INDEX.md](./src/services/INDEX.md) |
| `src/hooks/` | [hooks/INDEX.md](./src/hooks/INDEX.md) |
| `src/components/` | [components/INDEX.md](./src/components/INDEX.md) |
| `src/types/` | [types/INDEX.md](./src/types/INDEX.md) |
