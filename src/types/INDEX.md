# 📂 Guia de Tipagem Estrita (`guardiao-painel/src/types`)

Este diretório contém os arquivos de **Tipagens Estritas do TypeScript (`.ts`)**, responsáveis por unificar o contrato de dados consumido pelo painel administrativo, garantindo integridade estática do código, autocompletar robusto nas IDEs e prevenção rigorosa contra erros de tipo em tempo de execução.

---

## 🏗️ Mapeamento de Contratos de Dados (Tipos)

Abaixo estão descritos os modelos que dão suporte à engenharia de software da plataforma administrativa:

| Arquivo de Tipo | Modelo de Negócio Contido |
| :--- | :--- |
| 📄 [**contribution.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/contribution.ts) | Modelagem da Ocorrência Cívica (ID, título, descrição, coordenadas latitude/longitude, categoria, status, fotos, nível de risco IA, autoridade responsável). |
| 📄 [**user.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/user.ts) | Perfil do usuário com cargos (`role`: super_admin, moderator, operator, citizen) e restrições de nível de acesso. |
| 📄 [**campaign.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/campaign.ts) | Modelagem dos disparos automatizados de notificações transacionais (Brevo). |
| 📄 [**audit.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/audit.ts) | Modelo de logs de conformidade de ações administrativas no painel municipal. |
| 📄 [**automation.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/automation.ts) | Parâmetros de regras lógicas programadas para despacho automático. |
| 📄 [**errorLog.ts**](file:///home/ubuntu/Documents/Projetos/guardiao/guardiao-painel/src/types/errorLog.ts) | Modelo de captura de crashes para auditorias de estabilidade. |

---

## 🛡️ Importância da Tipagem Estrita no Guardião

* **Contratos Seguros de APIs**: Evita que atributos omitidos no banco de dados Firestore venham a travar a interface visual por erros de leitura indefinida (`undefined`).
* **Segurança de Código**: Protege regras cruciais de segurança física de acesso e níveis administrativos (por exemplo, forçando níveis numéricos de acesso de 0 a 3 nos cargos dos assessores).
