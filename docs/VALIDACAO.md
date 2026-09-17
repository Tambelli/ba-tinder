# Validação da reformulação

Verificação local em 16/09/2026, Windows, Node 24 e Java 21 temporário, sem instalação global de Java/Maven.

- Build Vite e checagem estrita de TypeScript concluídos.
- 4 testes de domínio: centavos, limites monetários, transições, gestos e etapas terminais.
- 14 cenários Playwright: 7 fluxos em desktop e em celular, com API controlada. Incluem descoberta, desfazer, filtros, briefing, cotação, cancelamento, login/logout, recuperação de erro, fila operacional e aceite do creator.
- 10 testes Java: 9 de integração de regras, autenticação e autorização; 1 de adoção de banco anterior e reaplicação idempotente de migrações.
- Teste adicional com navegador e API Java real: login com sessão/CSRF, orçamento de R$ 17.500,37, comissão de R$ 5.250,11, execução de R$ 12.250,26, envio do briefing, contato, aceite intermediado, negociação, fechamento e histórico com cinco registros. Sem erro JavaScript no navegador.
- Revisão visual de descoberta em desktop e celular; verificação de ausência de overflow horizontal a 390px. Capturas locais em `frontend/test-results/` (não versionadas).

O job PostgreSQL foi adicionado ao CI, mas não foi executado neste ambiente local. Docker Compose também não foi executado aqui: não há Docker instalado. Não foram realizados testes de carga, auditoria completa de acessibilidade, teste em aparelhos físicos, Safari/Firefox nem homologação de produção.

A prévia usa dados fictícios e banco H2 isolado em memória. O teste integrado cria registros locais de demonstração; não contata creators nem realiza pagamentos.

Comandos reproduzíveis e pré-requisitos estão no README. Critérios futuros e limitações de produto estão em ARQUITETURA.md.
