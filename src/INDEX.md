# 🏛️ Guia de Arquitetura do Painel Administrativo (`guardiao-painel/src`)

Bem-vindo ao **Painel de Controle e Centro de Operações Municipais do Guardião**. Este diretório (`src/`) contém toda a lógica da interface administrativa web utilizada por gestores de prefeituras, engenheiros de trânsito e equipes de moderação para triagem, inteligência e monitoramento de ocorrências cívicas em tempo real.

---

## 🗺️ Mapa de Responsabilidades do Diretório

Abaixo está o organograma das pastas que estruturam este projeto React 19 + Vite 5:

| Diretório / Arquivo | Finalidade de Negócio |
| :--- | :--- |
| 📂 [**components/**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/components/INDEX.md) | Componentes de UI reutilizáveis (Shadcn), gráficos estatísticos e telas administrativas complexas (Kanban, Sala de Guerra). |
| 📂 [**context/**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/context/INDEX.md) | Provedores de estado global, como a sessão de autenticação administrativa do Firebase (`AuthContext`). |
| 📂 [**hooks/**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/hooks/INDEX.md) | Hooks customizados para acoplamento reativo aos estados e sincronização via React Query. |
| 📂 [**services/**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/INDEX.md) | Camada lógica pura: geoprocessamento, moderação inteligente, campanhas transacionais e detecção de anomalias estatísticas. |
| 📂 [**types/**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/INDEX.md) | Tipagens TypeScript estritas que modelam as denúncias, logs de auditoria e configurações de campanhas. |
| 📂 [**stores/**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/stores/) | Lógica de estados com Zustand para gerenciar moderação e estados de animação globais da interface. |
| 📄 [**App.tsx**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/App.tsx) | Ponto de entrada da UI que configura o roteamento seguro e as rotas administrativas protegidas por níveis de acesso. |
| 📄 [**firebaseConfig.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/firebaseConfig.ts) | Inicialização nativa do cliente Firebase (Authentication, Firestore, Storage e Analytics). |
| 📄 [**main.tsx**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/main.tsx) | Bootstrap da aplicação React no DOM com montagem dos contextos e do React Query. |

---

## 🛠️ Tecnologias e Paradigmas Utilizados

1. **React 19 & TypeScript**: Aplicação de interfaces declarativas com tipagem robusta ponta a ponta.
2. **Vite 5**: Ferramenta de build de última geração para desenvolvimento instantâneo e bundling otimizado.
3. **TailwindCSS v4 & Shadcn UI**: Design contemporâneo, responsivo e baseado em tokens de design consistentes para painéis profissionais.
4. **Firebase SDK & React Query**: Sincronização offline-first reativa de dados e gerenciamento de requisições assíncronas.
