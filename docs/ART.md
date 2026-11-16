# Direção de arte: Abismo retrô

> Atualizado: as fichas de referência do autor (inimigos, armas e poderes em dark fantasy) substituíram o sumi-e em papel. Continuam valendo: silhuetas fortes, contorno de tinta, pixel e pontilhado, sangue como cor-base. Mudou: o mundo é escuro e cada poder tem sua própria cor. As armas do jogador vêm da ficha de armas do autor (assets/sprites/weapons), extrudadas em voxels.

## Histórico: Sumi-e sangrento, retrô

Uma regra decide tudo: **o mundo é papel e tinta; a única cor é o sangue.**
Se um elemento novo não serve a essa regra, ele não entra.

## Retrô: 4 cores, pontilhado, pixels grandes

A tela inteira é forçada para **exatamente quatro cores** no pós-processo (referência: Return of
the Obra Dinn, Game Boy). Sombras e degradês viram pontilhado ordenado (Bayer 4x4) em resolução
baixa. A fonte da interface é pixelada (DotGothic16, com kanji). Os materiais 3D só precisam
acertar o valor (claro, médio, escuro) e se algo é vermelho; o pós-processo decide a cor final.

## Paleta

| Papel | Uso | Valor |
|---|---|---|
| Papel | Céu, chão, névoa da distância, highlights | `#e9e3d5` |
| Lavagem | Sombras, pedra, distância média | `#8a857c` |
| Tinta | Silhuetas, inimigos, madeira, linhas | `#0e0c0c` |
| Sangue | Sangue, o sol, perigo, crítico. **Nada mais é vermelho.** | `#c8102e` |

Branco puro só para o brilho do aço e os olhos dos yokai.

## Linha

- Todo objeto tem contorno de tinta: silhuetas por detecção de borda na profundidade (pós-processo)
  e quinas desenhadas no próprio shader da arquitetura.
- A linha treme levemente, como pincel. Nunca é um vetor perfeito.

## Profundidade

Perspectiva atmosférica clássica de sumi-e: quanto mais longe, mais o objeto some no papel.
Montanhas em camadas de lavagem no horizonte. O sol vermelho é o único ponto focal do céu.

## Inimigos (yokai)

Silhuetas pretas legíveis à distância contra o chão claro. Olhos brancos. Feridas e bocas vermelhas.

| Simulação | Yokai | Silhueta |
|---|---|---|
| husk | Gaki (fantasma faminto) | Magro, curvado, braços longos, barriga inchada |
| caster | Nukekubi (cabeça voadora) | Cabeça com um olho e cabelo de tinta escorrendo |
| tengu | Karasu-tengu | Corvo humanoide, asas, bico |
| brute | Oni da Hannya | Gigante com uma máscara Hannya como escudo |
| ashura | Ashura | Três rostos brancos, seis braços, halo ensō |

## Efeitos

- Sangue: respingos vermelhos que **ficam no chão** (estilo MadWorld).
- Cortes e rastros: pinceladas de tinta preta, com centro vermelho quando acertam.
- Parry: a tela inverte por um instante (papel vira tinta).

## Psicodelia

Só existe como recompensa: a **Expansão de Domínio** é uma troca de paleta de cartucho antigo.
As quatro cores viram tons que giram e a imagem se dobra em caleidoscópio por 8 segundos.
Fora disso, nenhuma cor muda sozinha.

## Interface

Pixel art em tinta e quase nenhum texto. Sem rótulos que explicam o óbvio ("ENERGIA", "PONTOS").
As instruções ficam no menu, não no meio da tela.

## Proibido

Arco-íris, ciclo de matiz, neon, kanji decorativo flutuando, rosa de sakura, wireframe, emoji.
