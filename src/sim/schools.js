// The 20 power schools from the author's sheet ("20 poderes.png"). The player picks one school in
// the grimoire: its three skills go on Q / R / G and its ultimate on F (charged by the style
// meter). Numbers follow the sheet (reference: a common soldier has ~100 HP); cd in seconds.
// Behaviour lives in sim/abilities*.js, looks in render/abilityfx.js, sounds in audio/abilitysfx.js.
(function (SO) {
  'use strict';

  const S = (id, name, jp, color, tag, skills, ult) => ({ id, name, jp, color, tag, skills, ult });
  const K = (n, name, cd, dmg, desc) => ({ n, name, cd, dmg, desc });
  const U = (name, dur, dmg, desc) => ({ name, dur, dmg, desc });

  const LIST = [
    S('souls', 'Espadas Almas', '魂剣', 0x4aa8ff, 'Lâminas espectrais • combos aéreos', [
      K(1, 'Corte Fantasma', 4, '22 ×3', 'Três espadas espirituais cortam na direção da mira, uma após a outra, atravessando inimigos. A terceira lança os leves para o alto.'),
      K(2, 'Dança das Lâminas', 15, '15/golpe', 'Sete espadas orbitam você por 15 s atacando sozinhas e interceptando projéteis. Seus golpes fazem duas delas atacarem junto.'),
      K(3, 'Execução Celestial', 18, '95', 'Uma espada colossal cai sobre o alvo; a onda de choque derruba quem estiver perto.'),
    ], U('Trono das Mil Espadas', 10, '300', 'O céu se abre numa fenda azul. Por 10 s, lâminas perseguem quem você atacar; cada abate soma espadas ao arsenal. No fim, todas viram uma espada gigante na mira.')),

    S('void', 'Teleporte', '転移', 0xa35bff, 'Mobilidade dimensional • ataques surpresa', [
      K(1, 'Passo do Vazio', 5, '—', 'Teleporta até 12 m na direção do movimento e deixa uma imagem residual que atrai os inimigos.'),
      K(2, 'Troca Dimensional', 12, '30', 'Troca de lugar com o inimigo na mira, desorientando-o. Seu próximo golpe corpo a corpo causa dano extra.'),
      K(3, 'Ruptura Espacial', 17, '75', 'Abre dois portais e você atravessa o espaço entre eles em alta velocidade, cortando tudo no caminho.'),
    ], U('Colapso das Dimensões', 9, 'variável', 'Por 9 s seu teleporte (E) é livre e cada salto deixa uma fenda que explode perto de inimigos. No fim, as fendas se ligam e implodem puxando todos.')),

    S('demon', 'Explosão Demoníaca', '魔爆', 0xff2a1a, 'Destruição em área • ondas de choque', [
      K(1, 'Bastião Infernal', 6, '40', 'Golpeia o chão: explosão circular de energia demoníaca que empurra quem estiver perto.'),
      K(2, 'Onda de Choque', 14, '70', 'Uma parede de fogo escarlate rasga o chão em linha reta, atravessando e interrompendo inimigos.'),
      K(3, 'Detonação Total', 18, '120', 'Marca até cinco inimigos com runas demoníacas que explodem em sequência.'),
    ], U('Apocalipse', 8, '400', 'Um círculo demoníaco cobre a arena: por 8 s caem meteoros vermelhos nos inimigos, e uma esfera central explode no final.')),

    S('summon', 'Invocação de Demônios', '召魔', 0xd4143a, 'Aliados temporários • controle de arena', [
      K(1, 'Lacaios do Inferno', 5, '35', 'Dois demônios pequenos saem do chão e caçam inimigos com as garras por 12 s.'),
      K(2, 'Demônio Guardião', 14, '150', 'Um demônio de armadura e espada flamejante protege você, bloqueia projéteis e ataca quem chegar perto.'),
      K(3, 'Círculo Demoníaco', 18, '80', 'Área ritual na mira: quem ficar dentro sofre dano contínuo, fica enfraquecido e criaturas surgem das sombras.'),
    ], U('Portal Abissal', 10, '20/s', 'Um portal gigante despeja guerreiros, voadores e um comandante que atacam quem você marcar. O comandante encerra golpeando o chão.')),

    S('blood', 'Manipulação de Sangue', '血操', 0xe0102e, 'Roubo de vida • ataques fluidos', [
      K(1, 'Chicote Sanguíneo', 5, '35', 'Um chicote de sangue com espinhos atinge quem está à frente e puxa os leves até você.'),
      K(2, 'Lâminas Hemáticas', 12, '45', 'Lâminas de sangue giram ao seu redor e são lançadas nos inimigos mais próximos da mira, devolvendo vida.'),
      K(3, 'Prisão Carmesim', 18, '80', 'Tentáculos de sangue prendem os inimigos da mira numa esfera cristalizada por 3 s.'),
    ], U('Maré Carmesim', 10, '25/s', 'Uma tempestade de sangue fere tudo ao seu redor e cura você. No fim, uma onda colossal atravessa a arena.')),

    S('aegis', 'Escudo de Energia', '結界', 0x52e6ff, 'Defesa ativa • contra-ataques', [
      K(1, 'Barreira Energética', 6, 'bloqueia 300', 'Escudo frontal de placas hexagonais por 3 s. Você continua andando.'),
      K(2, 'Reflexo', 12, '—', 'Por 4 s devolve projéteis inimigos. No primeiro instante, devolve mais rápido e mais forte.'),
      K(3, 'Campo Protetor', 18, 'absorve 300', 'Cúpula hexagonal que absorve dano e destrói projéteis que entram por 5 s.'),
    ], U('Fortaleza Absoluta', 10, 'absorve 1000', 'Armadura de escudos em camadas. Cada golpe recebido dispara uma explosão defensiva; no fim, tudo explode numa onda.')),

    S('meteor', 'Meteoro', '隕石', 0xff7a1a, 'Ataques do céu • destruição', [
      K(1, 'Chuva de Meteoros', 6, '40 ×3', 'Três meteoros pequenos caem na área da mira e deixam chamas.'),
      K(2, 'Meteoro Guiado', 14, '70', 'Um meteoro desce seguindo sua mira e espalha fragmentos incandescentes.'),
      K(3, 'Impacto Celeste', 20, '150', 'Uma sombra cresce no chão e um bloco de rocha em brasa despenca, lançando inimigos.'),
    ], U('Tempestade Astral', 10, '500', 'Dezenas de meteoros caem na arena, mais perto de onde você mira. Termina com um meteoro colossal.')),

    S('fire', 'Corpo de Fogo', '炎身', 0xff5a00, 'Mobilidade agressiva • transformação', [
      K(1, 'Aura Flamejante', 6, '20/s', 'Chamas sobem pelo corpo por 5 s e queimam quem estiver perto.'),
      K(2, 'Impulso Ígneo', 14, '60', 'Arrancada em chamas que atravessa inimigos, até no ar, deixando brasas.'),
      K(3, 'Explosão Corporal', 18, '120', 'Concentra calor e explode, deixando os atingidos em chamas.'),
    ], U('Fênix Viva', 12, '300', 'Asas de fogo: mais velocidade, golpes que incendeiam e um mergulho explosivo (slam). No fim, as asas se fecham e explodem.')),

    S('plasma', 'Raio de Plasma', '光線', 0xb44dff, 'Precisão • energia concentrada', [
      K(1, 'Disparo de Plasma', 5, '30', 'Projétil rápido de plasma que atravessa um inimigo e acerta o de trás.'),
      K(2, 'Corrente Elétrica', 14, '45', 'Um raio salta entre até quatro inimigos próximos.'),
      K(3, 'Feixe Contínuo', 20, '100/s', 'Dispara um feixe concentrado por 2,5 s que segue sua mira. Você fica um pouco mais lento.'),
    ], U('Aniquilação', 8, '500', 'Um canhão orbital desce do céu na mira e segue para onde você aponta, rachando o chão. Termina em explosão de plasma.')),

    S('ice', 'Congelamento', '氷結', 0x9be8ff, 'Controle de multidões • fragmentação', [
      K(1, 'Estaca de Gelo', 6, '35', 'Lança de gelo que deixa o alvo lento. Contra alvo congelado, estilhaça com dano extra.'),
      K(2, 'Onda Fria', 16, '60', 'Uma camada de gelo corre pelo chão à frente e congela inimigos leves por 2 s.'),
      K(3, 'Prisão Glacial', 20, '—', 'Pilares de gelo prendem o alvo. Quando a prisão quebra, os fragmentos ferem quem estiver perto.'),
    ], U('Era do Gelo', 10, '200', 'A arena congela: inimigos comuns viram cristais e bosses ficam lentos. Quebrar um cristal causa explosões em cadeia.')),

    S('gravity', 'Gravidade', '重力', 0x9b4dff, 'Manipulação física • combos', [
      K(1, 'Puxão', 6, '—', 'Uma força gravitacional puxa os inimigos para o ponto da mira.'),
      K(2, 'Campo Gravitacional', 15, '—', 'Esfera de 6 s onde os inimigos flutuam, ficando vulneráveis a combos aéreos.'),
      K(3, 'Esmagamento', 18, '100', 'A gravidade sobre os alvos aumenta de repente e os esmaga contra o chão.'),
    ], U('Colapso Gravitacional', 10, '400', 'Uma singularidade suga inimigos e projéteis e cresce com o que absorve. Explode no final.')),

    S('bullets', 'Rajada de Balas', '弾幕', 0xff3030, 'Tiros rápidos • combate agressivo', [
      K(1, 'Disparo Rápido', 6, '25 ×5', 'Cinco disparos de energia em sequência; funciona no ar e no dash.'),
      K(2, 'Balas Buscadoras', 14, '60', 'Balas pairam diante de você e então fazem curvas até os inimigos.'),
      K(3, 'Metralhadora', 18, '120/s', 'Disparo contínuo por 3 s na direção da mira.'),
    ], U('Chuva de Projéteis', 8, '300', 'Círculos vermelhos se abrem no ar e uma tempestade de balas cai nos inimigos, mais forte nos que você marcou.')),

    S('spear', 'Lança de Energia', '光槍', 0x2ef2ff, 'Perfuração • investidas', [
      K(1, 'Arremesso', 6, '50', 'Lança de energia giratória que atravessa inimigos comuns.'),
      K(2, 'Investida', 14, '80', 'Avança com a lança estendida, atravessando e lançando inimigos para trás.'),
      K(3, 'Multiplicação', 20, '120', 'A lança se parte em cinco lanças menores que buscam os inimigos.'),
    ], U('Lança Dimensional', 10, '400', 'Uma lança gigante atravessa o cenário em linha reta e deixa uma fenda que continua ferindo.')),

    S('shadow', 'Clones Sombrios', '影分身', 0x7a3cff, 'Ilusão • ataques sincronizados', [
      K(1, 'Clone de Ataque', 6, '40', 'Sua sombra repete o próximo golpe corpo a corpo, com um leve atraso.'),
      K(2, 'Clones Múltiplos', 15, '30 cada', 'Três clones distraem os inimigos e atacam por alguns segundos.'),
      K(3, 'Explosão Sombria', 18, '100', 'Todos os clones avançam contra os inimigos e explodem.'),
    ], U('Exército de Sombras', 8, '25/s', 'Um exército de sombras repete seus golpes. No fim, todas avançam juntas na direção da mira.')),

    S('wind', 'Vento Cortante', '風刃', 0xdfe6ee, 'Velocidade • cortes de pressão', [
      K(1, 'Corte de Vento', 6, '35', 'Lâmina de ar comprimido que atravessa inimigos leves.'),
      K(2, 'Redemoinho', 14, '60', 'Um pequeno tornado na mira atrai e corta inimigos.'),
      K(3, 'Lâminas Aéreas', 18, '100', 'Três cortes de vento em leque que se cruzam no alvo.'),
    ], U('Fúria dos Ventos', 10, '300', 'Um tornado gigante ao seu redor ergue e corta os inimigos, arremessando-os no final.')),

    S('regen', 'Regeneração', '再生', 0x3dff7a, 'Sobrevivência • conversão de vida', [
      K(1, 'Cura Rápida', 6, '+80 HP', 'Recupera 80 de vida na hora, sem parar de lutar.'),
      K(2, 'Transferência', 14, '40', 'Fios verdes drenam a vida de um inimigo próximo e passam para você.'),
      K(3, 'Renovação', 18, '+20/s', 'Regenera 20 de vida por segundo durante 5 s.'),
    ], U('Imortalidade', 12, 'cura 500', 'Regeneração intensa e você não pode morrer. Golpes com a vida baixa soltam ondas verdes que empurram inimigos.')),

    S('thunder', 'Trovão', '雷', 0xffe14a, 'Velocidade • ataques em cadeia', [
      K(1, 'Raios em Cadeia', 6, '40', 'Um raio salta entre os inimigos próximos.'),
      K(2, 'Salto Elétrico', 15, '60', 'Salto impulsionado por eletricidade, com descargas na partida e na queda.'),
      K(3, 'Pilar de Raios', 20, '150', 'Nuvens escuras se juntam na mira e um raio espesso atordoa a área.'),
    ], U('Tempestade Divina', 10, '400', 'Raios caem sozinhos nos inimigos e você fica mais rápido. Termina com um relâmpago gigante na mira.')),

    S('dark', 'Escuridão', '闇', 0x8a3cff, 'Cegueira • drenagem de vida', [
      K(1, 'Nuvem Sombria', 6, '30', 'Fumaça violeta na mira: fere e cega quem está dentro.'),
      K(2, 'Cegueira', 14, '—', 'Pulso de escuridão: inimigos perdem você de vista por 5 s.'),
      K(3, 'Devorar Almas', 18, '80', 'Arranca a alma do inimigo na mira e a absorve, recuperando vida.'),
    ], U('Noite Eterna', 10, '25/s', 'A escuridão engole a arena: inimigos ficam cegos e brilham para você, e golpes neles causam mais dano.')),

    S('chaos', 'Lâminas do Caos', '混沌', 0xff2bd6, 'Lâminas orbitais • combos destrutivos', [
      K(1, 'Órbita Caótica', 6, '30', 'Três lâminas magenta giram ao seu redor cortando quem chegar perto.'),
      K(2, 'Corte Telecinético', 15, '70', 'Uma lâmina faz uma curva ampla à sua frente e volta.'),
      K(3, 'Espiral de Lâminas', 20, '120', 'Lâminas giram em espiral ao redor do alvo e convergem no centro.'),
    ], U('Dança do Caos', 10, '400', 'Dezenas de lâminas formam uma flor metálica e atacam sozinhas. Cada golpe seu muda a formação; no fim, todas avançam.')),

    S('elemental', 'Domínio Elemental', '元素', 0xf5f0ff, 'Fogo, gelo, raio e arcano • reações', [
      K(1, 'Fusão Elemental', 6, '40', 'Funde dois elementos, alternando: vapor (fogo+gelo), plasma (fogo+raio) e descarga congelante (gelo+raio).'),
      K(2, 'Orbes Elementais', 15, '70', 'Quatro orbes (fogo, gelo, raio, arcano) orbitam e atacam sozinhos.'),
      K(3, 'Combo Elemental', 20, '120', 'Três ataques elementais no alvo: o primeiro marca, o segundo reage, o terceiro explode.'),
    ], U('Cataclismo Elemental', 12, '500', 'Meteoros, pilares de gelo, raios e ondas arcanas tomam a arena. No fim, os quatro elementos explodem numa esfera.')),
  ];

  const BY_ID = {};
  for (const s of LIST) {
    BY_ID[s.id] = s;
    s.skills.forEach((k) => { k.id = s.id + '_' + k.n; k.school = s.id; });
    s.ult.id = s.id + '_ult'; s.ult.school = s.id;
  }
  const ELEMENT_COLORS = { fire: 0xff5a1a, ice: 0x9be8ff, thunder: 0xffe14a, arcane: 0xc04dff };

  SO.Schools = { LIST, BY_ID, DEFAULT: 'souls', ELEMENT_COLORS, get: (id) => BY_ID[id] || BY_ID.souls };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
