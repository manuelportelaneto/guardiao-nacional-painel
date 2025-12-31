# Procuradoria Cidadã - Painel Administrativo

Painel de administração web para gerenciamento de ocorrências e serviços municipais da plataforma Procuradoria Cidadã.

## 📋 Sobre o Projeto

O **Procuradoria Cidadã Painel** é uma aplicação web administrativa que permite gestores públicos e administradores monitorarem, gerenciarem e responderem às ocorrências recebidas através do aplicativo móvel Procuradoria Cidadã.

### Principais Funcionalidades

- **Sistema de Autenticação**
  - Login com email/senha
  - Login com Google (OAuth)
  - Login com telefone (SMS)
  - Recuperação de senha

- **Hub de Painéis**
  - Painel Geral (super admin)
  - Painéis Municipais (gestores locais)
  - Controle de acesso baseado em roles

- **Dashboard Geral (Super Admin)**
  - Métricas globais da plataforma em tempo real (Firestore)
  - Gráficos de ocorrências e resoluções
  - Estatísticas de usuários e municípios

- **Gestão Geográfica Hierárquica** ✨ NEW
  - Navegação Brasil > Região > Estado > Cidade
  - Descoberta automática de novas cidades via contribuições
  - Cards interativos para cada nível geográfico

- **Gestão Avançada de Usuários** ✨ NEW
  - Interface em Cards (substituiu tabela)
  - Busca por Nome, Email ou CPF
  - Badges de Gamificação e Status de Doador
  - Suporte a Níveis Profissionais (Servidor, Empresa Lvl 1-3)
  - Ações: Promover, Demover, Bloquear, Remover

- **Sistema de Painéis Municipais**
  - Seleção automática ou manual de município
  - Dashboard específico por cidade
  - Kanban de tarefas (ocorrências)
  - CRM de secretarias e servidores

## 🚀 Tecnologias

- **React** 19.2.0
- **TypeScript** 5.7.2
- **Vite** 5.4.21
- **Tailwind CSS** 4.1.17
- **Firebase** 11.2.0 (Auth, Firestore)
- **React Router** 7.1.1
- **Recharts** 2.15.0 (gráficos)
- **Radix UI** (componentes)
- **Lucide React** (ícones)

## 📁 Estrutura do Projeto

```
procuradoria-painel/
├── src/
│   ├── components/
│   │   ├── screens/          # Páginas principais
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── RoleHub.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── CitySelector.tsx
│   │   │   ├── CityDashboard.tsx
│   │   │   ├── TasksKanban.tsx
│   │   │   └── DepartmentsCRM.tsx
│   │   └── ui/               # Componentes reutilizáveis
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── sheet.tsx
│   │       └── ...
│   ├── context/
│   │   └── AuthContext.tsx   # Autenticação global
│   ├── firebaseConfig.ts     # Configuração Firebase
│   ├── App.tsx               # Roteamento
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globais
├── public/
│   └── logo-new.jpg
├── .env                      # Variáveis de ambiente
└── package.json
```

## ⚙️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Firebase configurada

### 1. Clone o repositório

```bash
git clone https://github.com/manuelportelaneto/procuradoria-cidada-painel.git
cd procuradoria-cidada-painel
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Execute em desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:5173`

### 5. Build para produção

```bash
npm run build
```

Os arquivos compilados estarão em `dist/`

## 🎯 Fluxo de Uso

1. **Login** → Autentique-se usando email, Google ou telefone
2. **Hub de Painéis** → Escolha entre Painel Geral ou Painel Municipal
3. **Painel Geral** → Visualize métricas globais (super admin)
4. **Selecionar Município** → Escolha qual cidade gerenciar
5. **Dashboard Municipal** → Veja métricas específicas da cidade
6. **Tarefas (Kanban)** → Gerencie ocorrências em quadro kanban
7. **Secretarias (CRM)** → Administre departamentos e servidores

## 🔐 Estrutura de Permissões

### Roles no Firestore

```javascript
users/{userId}:
  - role: 'admin' | 'super_admin' | 'city_admin' | 'user'
  - cities: ['maua', 'santo-andre', ...] // Municípios vinculados
```

- **super_admin / admin**: Acesso ao Painel Geral
- **city_admin**: Acesso a Painéis Municipais específicos
- **user**: Sem acesso ao painel

## 🗺️ Municípios Disponíveis

- Mauá/SP
- Santo André/SP
- São Caetano do Sul/SP
- São Paulo/SP

## 📊 Dashboard - Métricas

### Painel Geral
- Total de Usuários
- Ocorrências Ativas
- Resolvidos no Mês
- Número de Prefeituras

### Painel Municipal
- Usuários Ativos
- Ocorrências Ativas
- Resolvidos no Mês
- Número de Secretarias

## 🎨 Design System

O projeto utiliza **Tailwind CSS v4** com tema customizado:

- **Cores**: Primary (blue), Orange (municipal), Red, Green
- **Componentes**: shadcn/ui (Radix UI + Tailwind)
- **Tipografia**: System fonts
- **Dark Mode**: Preparado para implementação

## 🔄 Roteamento

```
/               → Login (AuthScreen)
/hub            → Hub de Painéis (RoleHub)
/admin/*        → Dashboard Geral (AdminDashboard)
/city/select    → Seleção de Município (CitySelector)
/city/:id/dashboard    → Dashboard Municipal
/city/:id/tasks        → Kanban de Tarefas
/city/:id/departments  → CRM Secretarias
```

## 🚧 Roadmap

- [x] Integração com Firestore (dados reais) ✅
- [x] Hierarquia Geográfica (Brasil > Região > Estado > Cidade) ✅
- [x] Gestão Avançada de Usuários (Cards, Busca CPF, Badges) ✅
- [ ] CRUD de tarefas no kanban
- [ ] Drag-and-drop no kanban
- [ ] CRUD de secretarias e servidores
- [ ] Moderação de Conteúdo
- [ ] Sistema de notificações
- [ ] Relatórios exportáveis
- [ ] Dark mode
- [x] Testes automatizados ✅
- [x] CI/CD com GitHub Actions ✅

## 🧪 Testes Automatizados

O projeto possui uma suite completa de testes automatizados:

### Testes Implementados

- **28 testes** passando em 4 arquivos
- **Cobertura**: Componentes principais, segurança e integrações

#### Tipos de Teste

1. **Testes Unitários** (13 testes)
   - AuthScreen: Login, registro, validação
   - TasksKanban: Renderização, colunas, tarefas

2. **Testes de Segurança** (10 testes)
   - Validação de email, senha, telefone
   - Proteção contra XSS
   - Sanitização de inputs

3. **Testes de Integração** (5 testes)
   - Fluxos de autenticação completos

### Stack de Testes

- **Vitest** 2.1.8 - Test runner
- **React Testing Library** - Testes de componentes
- **jsdom** - Ambiente de teste
- **@vitest/coverage-v8** - Coverage reports

### Scripts de Teste

```bash
npm run test              # Rodar todos os testes
npm run test:ui           # Interface UI para testes
npm run test:coverage     # Gerar relatório de cobertura
npm run test:security     # Audit + validação de env
npm run test:env          # Validar variáveis de ambiente
```

### CI/CD

GitHub Actions configurado para rodar automaticamente:
- ✅ Testes em cada push/PR
- ✅ ESLint e TypeScript check
- ✅ Security audit (npm audit)
- ✅ Coverage reports
- ✅ Build verification

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento
npm run build            # Build de produção
npm run preview          # Preview do build
npm run lint             # Verificar código com ESLint

# Testes
npm run test             # Rodar testes
npm run test:ui          # UI interativa de testes
npm run test:coverage    # Relatório de cobertura
npm run test:security    # Testes de segurança
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e de propriedade da Procuradoria Cidadã.

## 👥 Autores

- **Manuel Portela** - Desenvolvedor Principal

## 🔗 Links Relacionados

- [Procuradoria Cidadã Mobile](https://github.com/manuelportelaneto/procuradoria-cidada)
- [Procuradoria Cidadã Website](https://github.com/manuelportelaneto/procuradoria-cidada-website)
- [Documentação Firebase](https://firebase.google.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
