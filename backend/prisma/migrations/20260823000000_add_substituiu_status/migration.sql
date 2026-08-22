-- Novo status de confirmação: SUBSTITUIU. Igual a PRESENTE pra fins de
-- pagamento (é trabalho normal), mas identifica quem cobriu uma vaga que
-- estava com SUBSTITUICAO_NECESSARIA — usado pra abater essa contagem
-- urgente por tipo (ConfirmacoesService.resumoDaSede) e mostrar rótulo
-- próprio na tela (docs/features/confirmacao-dia.md).
ALTER TYPE "status_confirmacao" ADD VALUE 'SUBSTITUIU';
