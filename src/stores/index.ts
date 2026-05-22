/**
 * @fileoverview Barrel de Exportação dos Stores Zustand (`src/stores/index.ts`).
 *
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ponto único de importação (barrel export) para todos os stores Zustand do painel.
 * Em vez de importar de caminhos específicos (`../stores/moderationStore`), componentes
 * importam de `../stores` e acessam qualquer store disponível no sistema.
 * Isso simplifica refatorações futuras — mover um store não quebra importações nos componentes.
 */

export { useModerationStore, useConfirmDialog, useReplyDialog } from './moderationStore';
