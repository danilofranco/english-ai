# English AI (local-first, CEFR + practice)

App de evolução em inglês: níveis **CEFR**, biblioteca em `/content`, **prática com áudio**, **transcrição** (mock por defeito), **avaliação LLM** (DeepSeek → OpenAI), feedback rico, **retry** e fila de **reviews**.

## Requisitos

- Node 20+
- npm

## Setup rápido

```bash
cd english-ai
npm install
cp .env.example .env   # ou crie .env (ver abaixo)
```

**Base de dados (SQLite)** — migração baseline única (se já tinhas `dev.db` antigo, faz reset em dev):

```bash
npx prisma migrate reset   # apaga dados locais e reaplica migrations + seed opcional
# ou primeira vez:
npx prisma migrate deploy
npm run db:seed
```

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), regista-te ou usa o **demo** (após seed):

- Email: `demo@english.ai`
- Senha: `demo123`

## Variáveis `.env`

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | `file:./dev.db` (default) |
| `NEXTAUTH_SECRET` | segredo JWT |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `DEEPSEEK_API_KEY` | avaliação LLM (preferido) |
| `DEEPSEEK_MODEL` | ex.: `deepseek-chat` |
| `OPENAI_API_KEY` | fallback se DeepSeek falhar |
| `DEEPSEEK_BASE_URL` | opcional (default API DeepSeek) |

## Pasta `/content`

Organiza por **curso** em subpastas, por exemplo:

`content/NomeDoCurso/modulo1/`, `content/OutroCurso/A1/`, etc.

Depois de adicionar ou alterar ficheiros:

```bash
npm run content:sync
```

Isto grava `folderPath` (caminho sob `content/`) e tipos (vídeo, áudio, pdf, **html** para questionários tipo Fluency, …). Na **Biblioteca** (`/library`) podes filtrar por **curso** (primeira pasta) e por **pasta exacta**, e abrir vídeo/áudio/PDF/**HTML** no browser (stream via `/api/content/file` — só com sessão iniciada). Ficheiros `.html` autocontidos (JS/CSS inline) funcionam melhor; caminhos relativos para `assets/` ao lado do ficheiro podem falhar dentro do iframe até haver rota com `<base href>` dedicada.

Não há publicação nem redistribuição — só uso local.

## Onde integrar providers reais

| Função | Ficheiro | Notas |
|--------|----------|------|
| Transcrição servidor | [src/lib/ai/transcription.ts](src/lib/ai/transcription.ts) | Hoje: mock. Trocar por Whisper / AssemblyAI etc.; `POST /api/transcribe` já grava ficheiro e chama isto. |
| Avaliação | [src/lib/ai/evaluation.ts](src/lib/ai/evaluation.ts) | `evaluateResponse` → JSON com scores + strengths + `nextStep`. Persistido em [Evaluation](prisma/schema.prisma). |
| Sync disco → BD | [src/lib/sync-learning-content.ts](src/lib/sync-learning-content.ts) | Chamado por `npm run content:sync`. |

## Fluxo mínimo a testar

1. Login → **Dashboard** → **Practice** → escolher uma task.  
2. Gravar áudio → transcrição (mock) → submeter → **avaliação** → redirect para **review** com scores e próximos passos.  
3. **Retry** na mesma task; **Library** para material de apoio; **Reviews** para fila de follow-up.

## Rotas principais

| Rota | Função |
|------|--------|
| `/dashboard` | Resumo, nível estimado, hints da biblioteca |
| `/practice` | Lista de tasks |
| `/practice/[id]` | Gravação + histórico de tentativas |
| `/library` | Conteúdos indexados |
| `/levels` / `/levels/[code]` | CEFR + paths + tasks |
| `/paths/[id]` | Passos da trilha |
| `/reviews` | `ReviewItem` (fila) |
| `/progress` | Snapshot + tendência por task |

## Scripts

```bash
npm run dev           # dev server
npm run build         # prisma generate + next build
npm run db:migrate    # prisma migrate deploy
npm run db:seed       # seed níveis + tasks + paths + user demo
npm run content:sync  # indexar /content → BD
npx prisma studio     # inspecionar SQLite
```

## Licença / uso

Uso pessoal; não redistribuas conteúdo protegido colocado em `/content`.
