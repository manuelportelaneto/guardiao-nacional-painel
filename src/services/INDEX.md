# 📂 Guia da Camada de Serviços (`guardiao-painel/src/services`)

Este diretório contém a **lógica de negócios pura** da aplicação, isolando as chamadas de banco de dados, cálculos estatísticos complexos e integrações externas dos componentes visuais do React. Todos os serviços são modelados como objetos Singleton reutilizáveis.

---

## 🏛️ Dicionário de Serviços e Suas Engrenagens

Abaixo está o mapeamento detalhado da inteligência e lógica contida nesta pasta:

| Arquivo de Serviço | Função Pedagógica e Engenharia de Software |
| :--- | :--- |
| 🛡️ [**moderationService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/moderationService.ts) | Implementa o algoritmo de **Fila Inteligente (Smart Queue)**. Ele atribui scores de prioridade de 0 a 100 baseando-se no risco de IA, antiguidade da denúncia e palavras-chave de perigo iminente. |
| 🗺️ [**intelligenceService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/intelligenceService.ts) | Gerencia a renderização de mapas do Leaflet. Ele processa pontos de calor (Heatmaps) e executa **filtragem geométrica no cliente (Map Bounding Box)** para manter 60 FPS nas animações do mapa. |
| 📊 [**statsService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/statsService.ts) | Motor analítico urbano. Ele calcula taxas de crescimento de ocorrências e implementa **detecção preditiva de anomalias (Anomaly Detection)** para alertar prefeituras sobre surtos urbanos em 24h. |
| ✉️ [**campaignService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/campaignService.ts) | Sincroniza parâmetros de e-mails transacionais (via Brevo API) e notificações push para que o cidadão receba updates automáticos de aprovação ou rejeição de denúncias. |
| 👤 [**userService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/userService.ts) | Gerencia o controle de usuários do painel (como convites de novos assessores e promoção a níveis administrativos). |
| 🤖 [**automationService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/automationService.ts) | Ativa e coordena gatilhos lógicos automáticos de zeladoria (ex: notificar empresa de coleta se lixo acumula em ponto mapeado). |
| 🪵 [**loggingService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/loggingService.ts) | Registra de forma blindada ações críticas no Firestore (`audit_logs`) para conformidade de dados e auditoria contra vazamentos. |
| 🔗 [**externalDataService.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/services/externalDataService.ts) | Trata integrações de webhooks externos de prefeituras para despachar ou capturar logs cívicos no formato JSON. |

---

## 💡 Princípios de Design da Camada de Serviços

1. **Desacoplamento do Framework**: Nenhuma lógica de UI ou hooks do React são importados aqui. Os arquivos contêm funções TypeScript puras fáceis de testar em testes unitários.
2. **Segurança no Tratamento de Erros**: Todos os serviços utilizam blocos `try/catch` blindados retornando objetos vazios estruturados ou fallbacks seguros em caso de falha de conexão, impedindo travamentos (crashes) na tela do usuário.
3. **Economia de Recursos (Firestore Optimization)**: Limitação rigorosa de registros recuperados (`limit(50)`) e uso estratégico de filtros em memória para poupar consultas à API de dados da nuvem.
