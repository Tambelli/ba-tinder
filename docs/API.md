# API REST

Base: `/api`. JSON usa camelCase e valores monetários inteiros em centavos. Autenticação por sessão (cookie HttpOnly) com proteção CSRF do Spring Security. Frontend e backend são servidos na mesma origem.

## Sessão

- `GET /session`: público; retorna `authenticated`, `username`, `role`, `csrfToken`, `demo`, `matchMode`, `commissionMode`.
- `POST /login`: formulário URL-encoded com `username` e `password`; enviar `X-CSRF-TOKEN` obtido em `/session` e manter o cookie. Retorna 204 ou 401.
- **Depois do login**, buscar `/session` novamente para obter o token renovado.
- `POST /logout`: enviar o token CSRF e cookie. Retorna 204.

Qualquer mutação exige o header `X-CSRF-TOKEN`. Credenciais ficam somente no formulário; não há tokens ou senhas no localStorage. No navegador, o cookie mantém a sessão e a página consulta a sessão ao iniciar.

## Catálogo e simulação

`GET /creators?productNiche=Beleza&creatorNiche=Lifestyle&state=SP&minFollowers=100000&maxFollowers=150000&minEngagement=5&maxEngagement=6`

Filtros opcionais combinados com AND. Intervalos inclusivos; estado e nichos com comparação sem diferenciar maiúsculas. Ordenação por engajamento decrescente, seguidores decrescentes e ID. Retorna lista de creators sem informações privadas de contato.

`GET /quote?budgetCents=1000000`

Exemplo no modo INCLUDED:

```json
{"budgetCents":1000000,"commissionCents":300000,"executionCents":700000,"totalCents":1000000,"commissionMode":"INCLUDED"}
```

## Interesses

`POST /deals` — somente BRAND:

```json
{"creatorId":1,"budgetCents":1000000,"brief":"Lançamento de uma linha de beleza, duas entregas em outubro."}
```

Retorna a negociação persistida e seu histórico. Não aceita comissão calculada pelo cliente. Repetição do mesmo par marca/creator retorna 409, inclusive quando a negociação anterior já terminou.

`GET /deals` — escopo determinado pela identidade da sessão, nunca por um `brandId` enviado pelo cliente. BRAND recebe seus registros; OPS todos; CREATOR recebe seus convites em dupla aprovação depois da etapa inicial. Neste piloto a conta `creator` está vinculada ao ID 1.

## Operação

`PATCH /ops/deals/{id}` — somente OPS:

```json
{"status":"CONTACTING","owner":"Ana Silva","note":"Responsável atribuído; contato inicial em andamento."}
```

Valida a transição no servidor. `owner` e `note` são obrigatórios. A mudança e seu evento são gravados na mesma transação com bloqueio da negociação. Transições disponíveis em [PRODUTO.md](PRODUTO.md).

## Creator

`POST /creator/deals/{id}/decision` — somente CREATOR, para convite próprio em `AWAITING_CREATOR` e `DOUBLE_OPT_IN`:

```json
{"accepted":true,"note":"Tenho interesse e disponibilidade para conversar sobre as entregas."}
```

`accepted=false` registra recusa. Uma decisão é terminal para essa etapa; para aceitar é necessário aguardar a operação preparar o convite.

## Respostas de erro

- 400: filtros, valores, campos ou transição inválidos.
- 401: não autenticado ou credenciais incorretas.
- 403: papel sem permissão, convite de outro creator ou CSRF inválido.
- 404: creator/negociação inexistente.
- 409: interesse duplicado.

Erros de domínio retornam `{"message":"Descrição em português"}`. Erros do framework podem usar o formato padrão Spring; o frontend oferece mensagem alternativa. Briefing: 1–1500 caracteres não vazios; observação: 1–1000; responsável: 1–100.
