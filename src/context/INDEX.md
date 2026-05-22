# 📂 Guia do Diretório de Contextos (`guardiao-painel/src/context`)

Este diretório contém os **Provedores de Contexto do React (React Context Providers)**, responsáveis por gerenciar estados reativos globais compartilhados que precisam ser acessados por múltiplos componentes em qualquer nível da árvore do DOM.

---

## 🔑 Autenticação e Segurança Reativa

Atualmente, o principal contexto do projeto é o **`AuthContext.tsx`**:

### 📄 [AuthContext.tsx](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/context/AuthContext.tsx)
Trata-se do **coração de segurança e controle de privilégios** do painel administrativo.
1. **Monitoramento do Ciclo de Vida da Sessão**: Utiliza o listener reativo `onAuthStateChanged` do Firebase Authentication para capturar login e logout instantaneamente.
2. **Enriquecimento de Perfis**: Ao logar, busca na coleção `/users` do Firestore os metadados complementares do usuário, como o nível de acesso e o papel municipal (`role`).
3. **🚨 BYPASS DE SYSADMIN (Regra de Ouro)**:
   Contém uma regra de engenharia física crucial:
   ```typescript
   if (user.email === 'manuelpnforce@gmail.com') {
       data.role = 'super_admin';
       data.accessLevel = 3;
   }
   ```
   Isso serve como um circuito de segurança para garantir que Manuel (Criador e SysAdmin do ecossistema) sempre consiga acessar e operar o painel mesmo que haja perda de dados físicos ou exclusão acidental de registros na nuvem.

---

## 🛡️ Níveis de Permissões Gerenciados pelo Contexto

* **`super_admin` (Nível 3)**: Acesso ilimitado. Visualiza logs de auditoria brutos, gerencia chaves de API, adiciona novos prefeitos e gerencia automações.
* **`moderator` (Nível 2)**: Foco em triagem. Tem autoridade para aprovar ou rejeitar denúncias recebidas dos cidadãos e redefinir categorias e severidades.
* **`operator` (Nível 1)**: Visualização operacional. Atua nas equipes de campo resolvendo os problemas marcados no Kanban de zeladoria.
* **`citizen` (Nível 0)**: Sem acesso administrativo. É rejeitado preventivamente na tela de login administrativo do painel.
