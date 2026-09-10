# GoInsiders Match · ba-tinder

MVP de matchmaking entre marcas e creators, com intermediação comercial da GoInsiders e comissão de 30%. Backend em **Java 21 / Spring Boot 3.5.16**, frontend em **JavaScript nativo**, HTML e CSS responsivo.

O projeto implementa a descoberta e o acompanhamento de negociações diretas. Os perfis de demonstração são fictícios; o sistema não envia mensagens, cobra pagamentos ou consulta redes sociais.

## Executar com Docker

Requisito: Docker com Compose.

```sh
docker compose up --build
```

Acesse [http://localhost:8080](http://localhost:8080). O Compose expõe o app somente em localhost e mantém o banco H2 em um volume persistente. A primeira compilação baixa as dependências e executa os testes Java.

## Executar sem Docker

Requisitos: JDK 21, Maven 3.9+ e Node.js 22+. O frontend não tem dependências npm.

Na raiz do repositório:

```sh
node frontend/scripts/build.mjs
mvn -f backend/pom.xml verify
java -jar backend/target/ba-tinder-0.1.0.jar --app.demo=true
```

Abra [http://localhost:8080](http://localhost:8080). O backend entrega o frontend e a API na mesma origem. O banco persiste no diretório `data/` do diretório de execução. Para desenvolvimento, depois de gerar o frontend, também é possível usar `mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.arguments=--app.demo=true`. Alterações no frontend requerem nova geração e reinício/reempacotamento.

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
2. A marca pula um perfil ou arrasta para a direita/clica em **Tenho interesse**. Antes do envio, informa o investimento e um briefing. Perfis pulados são temporários, apenas na sessão da tela.
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

Para PostgreSQL, configure `DATABASE_URL=jdbc:postgresql://host:5432/database`, `DATABASE_USER` e `DATABASE_PASSWORD`. O driver e o schema inicial estão incluídos; **a validação automatizada usa H2**, não PostgreSQL. Antes de produção, valide contra o PostgreSQL escolhido e adote migrações versionadas. O H2 local é suficiente para experimentar este MVP.

## Estrutura

```text
backend/
  src/main/java/br/com/goinsiders/match/  API, segurança, regras e dados demo
  src/main/resources/                  Configuração e schema SQL
  src/test/                            Testes de integração
frontend/
  src/                                 HTML, JavaScript e CSS
  scripts/build.mjs                    Cópia dos assets para dist
  test/                                Testes do domínio de frontend
docs/                                  Regras e contrato da API
.github/workflows/ci.yml                Build e testes a cada push/PR
```

## Verificação

```sh
node --test frontend/test/domain.test.js
node frontend/scripts/build.mjs
mvn -f backend/pom.xml verify
```

Os testes cobrem filtros combinados, validação de valores e briefing, comissão incluída/adicionada e arredondamento, políticas preservadas na negociação, login, CSRF, permissões, isolamento entre marcas, duplicidade, transições, histórico e dupla concordância. O GitHub Actions executa essas mesmas verificações.

## Limites do MVP e próximos incrementos

- Contas piloto em memória; creator vinculado explicitamente ao perfil 1. Evoluir para usuários persistidos, cadastro, recuperação de senha e vínculo usuário/organização/creator.
- Catálogo sem CRUD ou importação. Definir curadoria, consentimento e fonte verificável de seguidores/engajamento; adicionar atualização e data de coleta.
- Uma negociação por marca/creator, sem reabertura nem alteração do orçamento. Evoluir para propostas versionadas e novas rodadas com prevenção de duplicação por requisição.
- Sem chat, notificações, contratos, uploads de evidências, pagamentos, cobrança ou repasses. Observações em texto são compartilhadas no histórico; não são um canal para notas internas confidenciais.
- Preparar operação pública: domínio e TLS, limitação de tentativas de login, identidade persistida, paginação, backups, observabilidade, migrações e processo de privacidade/retenção. A configuração local não representa uma implantação pronta para produção.

Detalhes em [docs/API.md](docs/API.md) e [docs/PRODUTO.md](docs/PRODUTO.md).
