# Multiplayer: como o jogo já está preparado

O multiplayer ainda não está ligado, mas o código foi organizado desde o início para que ele
entre sem reescrever o jogo. Este documento explica o que já existe e o passo a passo para ativar.

## O que já está pronto

### 1. A simulação não depende do navegador

Tudo em `src/core/util.js` e `src/sim/*` é JavaScript puro: sem DOM, sem Three.js, sem `window`.
Prova disso: `node tools/simtest.js 120 4` roda uma partida inteira com 4 jogadores-robô no Node.

| Arquivo | Responsabilidade |
|---|---|
| `src/sim/world.js` | Estado do mundo, colisão, dano, style meter, eventos, `snapshot()` |
| `src/sim/player.js` | Movimento (dash, slide, slam, wall jump), combos, parry, poderes |
| `src/sim/enemies.js` | IA dos inimigos (alvo = jogador vivo mais próximo) |
| `src/sim/destruct.js` | Cenário destrutível; `snapshot().arena` = pares `[id, altura]` (-1 = destruído), aplicados com `SO.Destruct.apply` |
| `src/sim/projectiles.js` | Projéteis, Getsuga, foice bumerangue, parry |
| `src/sim/waves.js` | Ondas; escala quantidade e vida pelo número de jogadores |
| `src/sim/arena.js` | Mapa como dados puros (servidor e cliente usam o mesmo) |

### 2. O jogador é controlado só por "comandos"

A cada tick (60 Hz) o cliente gera um `InputCommand` em JSON:

```json
{ "seq": 1042, "moveX": 0, "moveZ": 1, "yaw": 1.57, "pitch": -0.1, "buttons": 9, "weaponSel": -1 }
```

`buttons` é um bitmask (`SO.BTN`: JUMP, DASH, SLIDE, ATTACK, ALT, WAVE, BLINK, DOMAIN).
O mundo nunca lê teclado nem mouse: só `world.setCommand(pid, cmd)`. Isso é exatamente o que
um servidor recebe pela rede.

### 3. O que acontece vira "eventos" serializáveis

`world.step(dt)` produz uma lista de eventos JSON (`hit`, `kill`, `parry`, `slam`, `domain`...).
O cliente (`src/main.js`, função `handle`) transforma eventos em som, partículas e HUD.
Em rede, o servidor só precisa repassar esses eventos.

### 4. Renderização lê estado, não é dona dele

`src/render/views.js` sincroniza modelos com `world.enemies`, `world.projectiles`,
`world.hazards` e `world.players` (outros jogadores já têm um avatar). Ele funciona igual
com um `World` local ou com estado reconstruído de snapshots.

### 5. A "sessão" é o ponto de troca

`src/net/net.js` define a interface que o jogo usa:

```js
session.submit(cmd)   // envia o comando deste tick
session.tick(dt)      // avança e devolve eventos
session.world         // estado para desenhar
session.pid           // id do jogador local
```

Hoje existe só `LocalSession`. O multiplayer é escrever uma `OnlineSession` com a mesma interface.

### 6. RNG determinístico

Spawns e escolhas da IA usam `world.rng` (semente fixa), não `Math.random`. Efeitos visuais
podem usar `Math.random` à vontade porque não afetam a simulação.

## Passo a passo para ativar (quando for a hora)

1. **Servidor autoritativo** (`server/index.js`, Node + biblioteca `ws`):
   - carregar `src/core/util.js` e `src/sim/*.js` como o `tools/simtest.js` faz;
   - criar um `World`, `addPlayer(pid)` a cada conexão, `removePlayer` ao desconectar;
   - loop de 60 Hz: aplicar o último comando de cada jogador, `world.step(1/60)`;
   - a cada 2 ou 3 ticks enviar `PROTOCOL.snap(world.snapshot(), eventos)` para todos.
2. **`OnlineSession` no cliente**:
   - `submit(cmd)` envia `PROTOCOL.cmd(cmd)` pelo WebSocket;
   - **predição local**: rodar `SO.Player.step` no jogador local imediatamente
     (o jogo continua sem atraso de input);
   - **reconciliação**: ao receber snapshot, reposicionar o jogador local no estado do servidor
     e reaplicar os comandos com `seq` maior que `ack`;
   - **interpolação**: inimigos e outros jogadores desenhados ~100 ms no passado entre dois
     snapshots (o `Views.capture` já guarda `prev`/`cur`).
3. **Hitstop e câmera lenta** continuam locais (só visuais). O servidor nunca pausa.
4. **Escolas e ultimates**: cada jogador tem `school`, `skillCd`, `buffs` e `ult` no próprio estado, e
   aliados/efeitos guardam o dono (`owner`). Ultimates que mudam o mundo inteiro (câmera lenta,
   escurecer a tela) já são só visuais locais; para PvP, limitar o alcance das que afetam todos os inimigos.
5. **Lobby**: o botão "MULTIPLAYER · EM BREVE" do menu é o lugar para "Criar sala / Entrar".

## Tamanho de rede

`world.snapshot()` com 20 inimigos tem por volta de 2 KB em JSON. A 20 snapshots/s são ~40 KB/s por
jogador antes de compressão, aceitável para coop de 2 a 4 pessoas. Se precisar, trocar JSON por
arrays binários (Float32Array) reduz para cerca de 1/4.

## Modos que esta base suporta

- **Coop de ondas** (o mais natural): até 4 jogadores, ondas já escalam com `playerCount()`.
- **PvP duelo**: precisa de `damagePlayer` vindo de golpes de jogadores (hoje golpes só testam
  inimigos em `meleeTick`) e regras de parry entre jogadores.
