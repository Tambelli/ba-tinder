# GoInsiders Match · ba-tinder

Aplicativo de descoberta e negociação entre marcas e creators, com intermediação comercial da GoInsiders e comissão de 30%. Interface reformulada em **React + TypeScript + Vite**, backend em **Java 21 / Spring Boot 3.5.16**, migrações **Flyway** e opção de **PostgreSQL**. A experiência se inspira na descoberta por cards do Tinder, com finalidade exclusivamente profissional.

A escolha das tecnologias, alternativas avaliadas, requisitos e evolução estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md). Java foi mantido pela adequação às regras já testadas; a interface foi reconstruída em componentes tipados, com navegação móvel, gestos, desfazer, filtros e estados de erro.

O projeto implementa a descoberta e o acompanhamento de negociações diretas. Os perfis de demonstração são fictícios; o sistema não envia mensagens, cobra pagamentos ou consulta redes sociais.

## Executar com Docker

Requisito: Docker com Compose.

```sh
docker compose up --build
```

Acesse [http://localhost:8080](http://localhost:8080). O Compose expõe o app somente em localhost e mantém o banco H2 em um volume persistente. A primeira compilação baixa as dependências e executa os testes Java.

## Executar sem Docker

Requisitos: JDK 21, Maven 3.9+ e Node.js 22.18+ (recomendado: Node 24).

Na raiz do repositório:

```sh
npm ci --prefix frontend
npm run build --prefix frontend
mvn -f backend/pom.xml verify
java -jar backend/target/ba-tinder-0.1.0.jar --app.demo=true
```

Abra [http://localhost:8080](http://localhost:8080). O backend entrega o frontend e a API na mesma origem. O banco persiste no diretório `data/` do diretório de execução.

Para desenvolvimento, inicie o backend com `mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.arguments=--app.demo=true`. Em outro terminal, rode `npm run dev --prefix frontend` e abra [http://localhost:5173](http://localhost:5173). O Vite encaminha `/api` para a porta 8080 e atualiza a interface durante a edição. O pacote final continua sendo servido pelo Spring, sem servidor Node em produção.

## Acessos de demonstração

Disponíveis somente com `APP_DEMO=true` ou `--app.demo=true`:

| Perfil | Usuário | Senha |
|---|---|---|
| Marca | `marca` | `demo-marca-2026` |
| Operação GoInsiders | `operacao` | `demo-operacao-2026` |
| Creator (Marina Costa, ID 1) | `creator` | `demo-creator-2026` |

Há botões de acesso na tela de login quando a demonstração está habilitada. Sem demonstração, o app exige senhas configuradas por ambiente com pelo menos 12 caracteres. Ainda são três contas piloto; não há cadastro ou gestão de usuários em produção.

## Fluxo implementado

1. A marca combina nicho do produto, nicho do creator, UF, faixa de seguidores e faixa de engajamento. Os filtros são cumulativos; o catálogo é ordenado por engajamento e seguidores, sem pontuação de afinidade inventada.
2. A marca pula um perfil ou arrasta para a direita/clica em **Tenho interesse**. Antes do envio, informa o investimento e um briefing. **Voltar** desfaz o último perfil pulado. Perfis pulados são temporários, apenas na sessão da tela de descoberta.
3. A solicitação entra na fila da GoInsiders com status **Interesse enviado**. O mesmo par marca/creator não pode gerar solicitações duplicadas neste MVP.
4. A operação atribui um responsável e registra contato, aceite, negociação e fechamento, mantendo histórico de cada etapa.
5. A marca acompanha seus interesses. No modo de dupla aprovação, o creator recebe o convite no app após a operação prepará-lo.

### Regras de negócio confirmadas

| Decisão | Regra aprovada e padrão do app | Alternativa técnica opcional |
|---|---|---|
| Aceite do creator | `MATCH_MODE=MEDIATED`: marca seleciona; GoInsiders obtém e registra a concordância | `DOUBLE_OPT_IN`: creator precisa aceitar no app |
| Base da comissão | `COMMISSION_MODE=INCLUDED`: 30% incluídos no investimento total | `ADDED`: 30% adicionados ao investimento em mídia |

No padrão, **R$ 10.000 = R$ 3.000 GoInsiders + R$ 7.000 execução/creator**. Na alternativa, **R$ 10.000 de mídia + R$ 3.000 GoInsiders = R$ 13.000 cobrados da marca**. Valores são calculados no servidor em centavos; arredondamento comercial HALF_UP. A política e os valores ficam registrados em cada negociação e não mudam ao alterar a configuração global. O percentual permanece fixo em 30%.

O cálculo pertence exclusivamente à negociação direta. Nenhuma regra de post fixo/escalonado foi incorporada: os detalhes dos outros modelos não fazem parte deste escopo. O valor da execução não representa um repasse já realizado; contratos, impostos, pagamentos e eventuais custos adicionais ainda não são modelados.

As regras **MEDIATED** e **INCLUDED** foram confirmadas para a primeira versão. As alternativas estão disponíveis apenas para uma futura mudança deliberada de configuração.

O serviço exige **time comercial/operacional dedicado** para qualificar o briefing, validar o creator, obter concordância, negociar entregas e direitos, registrar condições e acompanhar execução. O software oferece a fila, o responsável e o histórico; o contato efetivo é feito pela equipe fora do app.

### Configuração

```sh
java -jar backend/target/ba-tinder-0.1.0.jar --app.demo=true --app.match-mode=DOUBLE_OPT_IN --app.commission-mode=ADDED
```

Também são aceitas as variáveis `APP_DEMO`, `MATCH_MODE`, `COMMISSION_MODE`, `BRAND_PASSWORD`, `OPS_PASSWORD`, `CREATOR_PASSWORD`, `PORT` e `SERVER_ADDRESS`. O arquivo `.env` é lido pelo **Docker Compose**; a execução direta Java requer variáveis exportadas ou argumentos. Use `.env.example` como referência.

Para PostgreSQL, configure `DATABASE_URL=jdbc:postgresql://host:5432/database`, `DATABASE_USER` e `DATABASE_PASSWORD`. Driver e migrações estão incluídos. Há um job CI específico para PostgreSQL 17; o teste local padrão usa H2.

Para experimentar PostgreSQL via Docker, defina `POSTGRES_PASSWORD` no `.env` e rode:

```sh
docker compose -f compose.yaml -f compose.postgres.yaml up --build
```

O banco fica em volume próprio e não expõe porta ao host. Essa configuração cria uma base independente; não importa automaticamente os dados H2.

### Atualização de uma instalação anterior

Bancos novos recebem V1 e V2 automaticamente pelo Flyway. Para um banco do MVP anterior que já contém as três tabelas, faça backup e confirme que o schema corresponde à V1. Só nessa primeira atualização configure `DATABASE_BASELINE=true` (ou `--spring.flyway.baseline-on-migrate=true`). O Flyway registra a versão inicial e aplica V2 sem recriar as tabelas. Depois remova a variável. O baseline é desabilitado por padrão para não aceitar silenciosamente um schema desconhecido. Nunca altere migrações já aplicadas; crie uma nova versão.

## Estrutura

```text
backend/
  src/main/java/br/com/goinsiders/match/  API, segurança, regras e dados demo
  src/main/resources/db/migration/     Migrações versionadas do banco
  src/test/                            Testes de integração
frontend/
  src/components/                      Descoberta, proposta, negociação e login
  src/types.ts, api.ts, domain.ts        Contratos, transporte e regras da interface
  src/styles.css                       Design responsivo e estados de interação
  test/                                Testes do domínio TypeScript
  e2e/                                 Fluxos em navegador desktop e móvel
docs/                                  Regras e contrato da API
.github/workflows/ci.yml                Build e testes a cada push/PR
```

## Verificação

```sh
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
cd frontend
npx playwright install chromium
npm run test:e2e
cd ..
mvn -f backend/pom.xml verify
```

Os testes Java cobrem filtros combinados, valores, comissão, arredondamento, políticas preservadas, login, CSRF, permissões, isolamento entre marcas, duplicidade, transições, histórico, dupla concordância e migração do banco anterior. Os testes de navegador usam respostas de API controladas para exercitar os componentes em desktop e celular; não substituem a integração com o backend. O GitHub Actions executa build, tipos, testes de domínio e navegador, além do backend em H2 e PostgreSQL.

Para validar também o navegador com a API real, inicie uma instância demo isolada (não use dados de trabalho):

```sh
java -jar backend/target/ba-tinder-0.1.0.jar --app.demo=true "--spring.datasource.url=jdbc:h2:mem:smoke;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
```

Em outro terminal execute `node frontend/scripts/smoke.mjs`. O teste cria uma negociação fictícia e percorre contato, aceite, negociação e fechamento. Gera capturas em `frontend/test-results/`. A base em memória desaparece ao encerrar o servidor. `SMOKE_URL` permite escolher outra porta local.

## Limites do MVP e próximos incrementos

- Contas piloto em memória; creator vinculado explicitamente ao perfil 1. Evoluir para usuários persistidos, cadastro, recuperação de senha e vínculo usuário/organização/creator.
- Catálogo sem CRUD ou importação. Definir curadoria, consentimento e fonte verificável de seguidores/engajamento; adicionar atualização e data de coleta.
- Uma negociação por marca/creator, sem reabertura nem alteração do orçamento. Evoluir para propostas versionadas e novas rodadas com prevenção de duplicação por requisição.
- Sem chat, notificações, contratos, uploads de evidências, pagamentos, cobrança ou repasses. Observações em texto são compartilhadas no histórico; não são um canal para notas internas confidenciais.
- Preparar operação pública: domínio e TLS, limitação de tentativas de login, identidade persistida, paginação, backups, observabilidade e processo de privacidade/retenção. Migrações versionadas já estão implementadas. A configuração local não representa uma implantação pronta para produção.

Detalhes em [docs/API.md](docs/API.md) e [docs/PRODUTO.md](docs/PRODUTO.md).
