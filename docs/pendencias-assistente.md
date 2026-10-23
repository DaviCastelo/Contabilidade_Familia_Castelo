# Assistente IA: o que falta para finalizar

Estado em 2026-10-23. Código: `src/lib/assistant/` (agente e ferramentas), `src/app/api/assistente/route.ts` (API) e `src/app/(app)/assistente/` (tela de chat).

## Já pronto

- Agente com Claude (`claude-sonnet-5-5` por padrão, trocável pela variável `ASSISTANT_MODEL`). Usa loop manual de ferramentas, cache do prompt, fallback em caso de recusa e `drop_block` para os blocos de raciocínio.
- 20 ferramentas (incluindo metas: `listar_metas` e `guardar_na_meta`): consultar resumo, lançamentos, faturas, recorrentes e investimentos; criar e editar lançamentos (inclusive parcelados), recorrentes, orçamento, investimentos, categorias e contas; excluir somente após confirmação.
- As ferramentas rodam com o login de quem está conversando, então o RLS do Supabase limita tudo à própria família.
- Histórico salvo por pessoa em `ai_conversations`: `messages` guarda o histórico da API sem alterações e `display` guarda o que aparece na tela.
- Tela de chat com sugestões, "Nova conversa" e marcação das ações feitas em cada resposta.
- Ferramentas testadas direto no banco (escrita, leitura e mensagens de erro).

## Falta fazer

1. **Configurar a chave.** Criar a chave em console.anthropic.com e adicionar `ANTHROPIC_API_KEY` na Vercel (Production, Preview e Development). Depois, republicar o projeto. Vale definir um limite mensal de gasto no console.
2. **Testar com o modelo de verdade.** Até agora o diálogo com o Claude não foi testado. Rodar uma bateria de pedidos reais e conferir no banco o que foi gravado:
   - "mercado 230 no pix ontem"
   - "TV de 3 mil em 10x no Nubank"
   - "quanto gastamos com alimentação?"
   - "exclui o lançamento X" (precisa pedir confirmação antes)
   - "cadastra o salário todo dia 5"
   - "vai sobrar dinheiro?"
3. **Conferir o cache.** Olhar `usage.cache_read_input_tokens` nas respostas. Se ficar em zero nas mensagens seguidas, algo está mudando o prefixo (system ou ferramentas).
4. **Escolher o modelo pelo custo.** Comparar Sonnet 5.5 e Haiku 5.5 nos mesmos pedidos e decidir o `ASSISTANT_MODEL` final.
5. **Mostrar a resposta enquanto ela é escrita (streaming).** Hoje a resposta só aparece no fim, depois de alguns segundos de "Pensando…".
6. **Botões de confirmação.** Quando o assistente pedir "confirma a exclusão?", mostrar botões "Sim" e "Não" em vez de depender de texto digitado.
7. **Limite de uso.** Criar um limite simples de mensagens por pessoa por dia, para evitar gasto inesperado. Registrar o consumo de tokens por mensagem para acompanhar o custo.
8. **Lista de conversas.** Hoje só abre a mais recente. Permitir ver e apagar conversas antigas.
9. **Erros no meio do turno.** Se a API falhar depois de uma ferramenta já ter gravado algo, o turno não é salvo no histórico, mas o dado fica no banco. Mostrar ao usuário o que chegou a ser feito.
10. **Extras para depois:** lançar por WhatsApp ou Telegram, leitura de nota fiscal (NFC-e) por foto e resumo mensal automático ("para onde foi o dinheiro").
