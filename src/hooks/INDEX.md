# 📂 Guia de Hooks Reativos (`guardiao-painel/src/hooks`)

Este diretório contém os **React Hooks customizados**, responsáveis por encapsular lógicas reativas complexas, facilitando a reutilização de código e mantendo as telas (`screens`) limpas e focadas na apresentação visual.

---

## 🪝 Principais Hooks do Sistema

### 📄 [useContributions.ts](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/hooks/useContributions.ts)
Este hook é o principal ponto de consumo reativo das denúncias cívicas do Guardião.
1. **Integração com React Query**: Encapsula as requisições assíncronas para busca de dados no banco Firestore, gerando estados automáticos de `isLoading`, `isError` e `refetch`.
2. **Cache Inteligente**: Reduz chamadas repetidas de rede ao manter os dados carregados em cache local, atualizando de forma inteligente apenas se houver alterações de foco ou ao acionar atualizações manuais no painel do Kanban.
3. **Tipagem Unificada**: Devolve coleções fortemente tipadas de acordo com as especificações estritas do ecossistema.

---

## 💡 Vantagens de Usar Hooks Customizados

* **Separação de Preocupações (Separation of Concerns)**: Os componentes visuais não precisam saber como o Firebase se conecta ou como o cache funciona; eles apenas consomem as denúncias chamando `useContributions()`.
* **DRY (Don't Repeat Yourself)**: Evita a duplicação de códigos de busca assíncrona, tratamento de erros e gerenciamento de estados de carregamento em múltiplas páginas administrativas.
