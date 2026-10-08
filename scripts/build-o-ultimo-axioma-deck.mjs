import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Presentation, PresentationFile } from '@oai/artifact-tool'

const workspaceDir = path.resolve(import.meta.dirname, '..')
const SKILL_DIR = '/Users/marco.calijorne.br/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations'
const RUNTIME_PYTHON = '/Users/marco.calijorne.br/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
const buildDir = path.join(workspaceDir, '.artifacts-build', 'ultimo-axioma-deck')
const previewDir = path.join(buildDir, 'previews')
const finalPath = path.join(workspaceDir, 'artifacts', 'O_Ultimo_Axioma_Apresentacao.pptx')
const heroPath = path.join(workspaceDir, 'artifacts', 'assets', 'o-ultimo-axioma-hero.png')

const W = 1280
const H = 720
const C = {
  black: '#0E0D10', ink: '#F4ECE3', muted: '#B5AAA4', dim: '#7E7471',
  panel: '#1B181D', panel2: '#241F25', line: '#40363D', rust: '#D5673B',
  orange: '#E89A60', gold: '#D4A868', green: '#8BC99D', red: '#E58778', teal: '#79BFC1',
}
const FONT = 'Arial'

async function bytes(filePath) {
  const data = await fs.readFile(filePath)
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
}

function rect(slide, left, top, width, height, fill, line = 'none', radius = undefined) {
  return slide.shapes.add({
    geometry: radius ? 'roundRect' : 'rect',
    position: { left, top, width, height },
    fill,
    line: { style: 'solid', fill: line, width: line === 'none' ? 0 : 1 },
    ...(radius ? { borderRadius: radius } : {}),
  })
}

function textBox(slide, text, left, top, width, height, options = {}) {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    position: { left, top, width, height },
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  })
  shape.text = text
  shape.text.style = {
    typeface: FONT,
    fontSize: options.fontSize ?? 24,
    bold: options.bold ?? false,
    color: options.color ?? C.ink,
    italic: options.italic ?? false,
    autoFit: 'shrinkText',
    ...options.style,
  }
  return shape
}

function label(slide, value, left = 72, top = 56, width = 500) {
  return textBox(slide, value.toUpperCase(), left, top, width, 26, { fontSize: 13, bold: true, color: C.rust })
}

function title(slide, value, top = 92, width = 1020) {
  return textBox(slide, value, 72, top, width, 70, { fontSize: 42, bold: true })
}

function footer(slide, number, section = 'O ÚLTIMO AXIOMA') {
  textBox(slide, section, 72, 682, 450, 18, { fontSize: 10, bold: true, color: C.dim })
  textBox(slide, String(number).padStart(2, '0'), 1180, 682, 28, 18, { fontSize: 10, bold: true, color: C.dim })
}

function darkSlide(presentation) {
  const slide = presentation.slides.add()
  slide.background.fill = C.black
  return slide
}

function addStatement(slide, heading, body, left, top, width, accent = C.rust) {
  rect(slide, left, top, 4, 90, accent)
  textBox(slide, heading, left + 18, top, width - 18, 28, { fontSize: 18, bold: true, color: C.ink })
  textBox(slide, body, left + 18, top + 34, width - 18, 58, { fontSize: 15, color: C.muted })
}

function addSeal(slide, n, rune, name, x, y, active = false) {
  const fill = active ? '#48281F' : C.panel
  const line = active ? C.rust : C.line
  const circle = slide.shapes.add({ geometry: 'ellipse', position: { left: x, top: y, width: 68, height: 68 }, fill, line: { style: 'solid', fill: line, width: 2 } })
  circle.text = rune || String(n)
  circle.text.style = { typeface: FONT, fontSize: 25, bold: true, color: active ? C.orange : C.muted, autoFit: 'shrinkText' }
  textBox(slide, name, x - 28, y + 78, 124, 36, { fontSize: 13, bold: true, color: active ? C.ink : C.muted })
}

function addMissionSlide(presentation, number, mission) {
  const slide = darkSlide(presentation)
  label(slide, `SELO ${mission.order} · ${mission.studio}`)
  title(slide, mission.title)
  textBox(slide, mission.atmosphere, 74, 165, 770, 50, { fontSize: 17, color: C.muted, italic: true })
  rect(slide, 72, 228, 760, 4, C.rust)
  textBox(slide, mission.objective, 72, 250, 760, 86, { fontSize: 26, bold: true })
  rect(slide, 876, 54, 332, 558, C.panel, C.line, 'rounded-xl')
  textBox(slide, `RUNA ${mission.rune}`, 908, 82, 250, 30, { fontSize: 14, bold: true, color: C.gold })
  textBox(slide, String(mission.order), 912, 125, 95, 98, { fontSize: 72, bold: true, color: C.rust })
  textBox(slide, `${mission.minutes} min`, 1045, 158, 120, 32, { fontSize: 20, bold: true, color: C.muted })
  textBox(slide, mission.data, 908, 252, 266, 160, { fontSize: 17, color: C.ink })
  textBox(slide, 'EVIDÊNCIAS', 908, 446, 220, 24, { fontSize: 12, bold: true, color: C.rust })
  textBox(slide, 'Representação\nResultado\nTeste\nExplicação', 908, 480, 230, 110, { fontSize: 18, color: C.muted })
  textBox(slide, 'A resposta só vale quando os quatro registros concordam.', 72, 592, 760, 42, { fontSize: 16, color: C.gold })
  footer(slide, number, 'SETE SELOS DO PARADOXO')
}

const missions = [
  { order: 1, rune: 'P', title: 'Arquivo Vazio', studio: 'Conjuntos', minutes: 14, atmosphere: 'Fichas sem origem surgem em um arquivo que não deveria existir.', objective: 'Calcule (A ∪ B) \\ C e registre a cardinalidade.', data: 'A = {1,2,3,5,8,12}\nB = {2,4,5,7,8,11}\nC = {1,4,8,10}' },
  { order: 2, rune: 'A', title: 'Corredor dos Vínculos', studio: 'Relações', minutes: 14, atmosphere: 'Retratos ligados por fios mudam quando ninguém os observa.', objective: 'Classifique a relação e encontre o par que restaura a transitividade.', data: 'S = {A,B,C,D}\nLaços em todos os elementos\nA se liga a B\nB se liga a C' },
  { order: 3, rune: 'R', title: 'Galeria dos Espelhos', studio: 'Funções', minutes: 14, atmosphere: 'Dois reflexos ocupam o mesmo destino enquanto uma saída permanece vazia.', objective: 'Classifique a função e altere uma imagem para obter uma bijeção.', data: 'Iris ↦ Leste\nNox ↦ Sul\nOrfeu ↦ Leste\nSalma ↦ Norte' },
  { order: 4, rune: 'A', title: 'Capela das Vozes', studio: 'Lógica e equivalências', minutes: 18, atmosphere: 'Uma voz promete a abertura. Outra garante que ela não ocorreu.', objective: 'Encontre a conclusão, classifique a fórmula e complete a equivalência.', data: 'p → q\n¬q\n((p → q) ∧ ¬q) → ¬p\np → q ≡ ?' },
  { order: 5, rune: 'D', title: 'Autômato Cego', studio: 'Lógica em algoritmos', minutes: 16, atmosphere: 'O autômato executa qualquer regra, inclusive uma regra com precedência errada.', objective: 'Escolha o predicado correto e informe as quatro saídas.', data: '(selo && operador)\n||\n(emergencia && guardiao)\n\nTestes: 1100 · 1010 · 0011 · 0110' },
  { order: 6, rune: 'O', title: 'Sala das Lâmpadas Mortas', studio: 'Circuitos digitais', minutes: 16, atmosphere: 'Duas chaves disputam um sinal enquanto um inibidor apaga a sala.', objective: 'Escreva a expressão e encontre as entradas que acendem a lâmpada.', data: 'Entradas: A, B, I\nSaída: L\nA e B alimentam XOR\nI passa por NOT\nOs sinais seguem para AND' },
  { order: 7, rune: 'X', title: 'Labirinto das Possibilidades', studio: 'Princípios de contagem', minutes: 16, atmosphere: 'Cada escolha multiplica os corredores. Alguns caminhos só podem ser somados.', objective: 'Resolva quatro contagens e some os resultados.', data: '2 rotas ou 3 túneis\n3 portas e 4 chaves\nEscolha 3 entre 7\nCódigo de 3 dígitos sem repetição' },
]

async function build() {
  await fs.mkdir(buildDir, { recursive: true })
  await fs.mkdir(previewDir, { recursive: true })
  await fs.mkdir(path.dirname(finalPath), { recursive: true })
  const presentation = Presentation.create({ slideSize: { width: W, height: H } })
  const hero = await bytes(heroPath)

  // 1. Cover
  {
    const slide = darkSlide(presentation)
    slide.images.add({ blob: hero, contentType: 'image/png', alt: 'Arquivo universitário sombrio com uma porta cercada por sete selos geométricos', fit: 'cover', position: { left: 0, top: 0, width: W, height: H } })
    rect(slide, 0, 0, 620, H, '#111015')
    label(slide, 'EVENTO INTEGRADOR · MATEMÁTICA COMPUTACIONAL', 72, 82, 500)
    textBox(slide, 'O Último\nAxioma', 72, 142, 490, 180, { fontSize: 65, bold: true })
    textBox(slide, 'Os Sete Selos do Paradoxo', 74, 340, 470, 46, { fontSize: 25, color: C.gold })
    textBox(slide, 'Uma experiência colaborativa de 180 minutos', 74, 420, 430, 30, { fontSize: 17, color: C.muted })
    rect(slide, 74, 486, 170, 3, C.rust)
    textBox(slide, 'Apresentação para projeção em sala', 74, 510, 430, 24, { fontSize: 13, bold: true, color: C.dim })
  }

  // 2. Premise
  {
    const slide = darkSlide(presentation); label(slide, 'PRÓLOGO'); title(slide, 'A oitava operação')
    textBox(slide, 'Às 23h17, o sistema da universidade registrou uma operação que não pertence a nenhuma das sete famílias conhecidas.', 72, 188, 800, 92, { fontSize: 28, bold: true })
    textBox(slide, 'Desde então, portas surgem onde havia paredes. Cada uma responde a uma prova matemática. Uma resposta sem evidência alimenta o paradoxo.', 72, 316, 800, 106, { fontSize: 22, color: C.muted })
    textBox(slide, 'A turma entra como uma expedição. As equipes saem apenas quando as sete runas formarem a chave final.', 72, 488, 800, 76, { fontSize: 20, color: C.gold })
    rect(slide, 950, 150, 180, 300, C.panel, C.line, 'rounded-xl')
    textBox(slide, '7', 985, 185, 110, 100, { fontSize: 78, bold: true, color: C.rust })
    textBox(slide, 'SELOS', 993, 294, 100, 28, { fontSize: 15, bold: true, color: C.muted })
    textBox(slide, '1', 985, 350, 110, 70, { fontSize: 50, bold: true, color: C.gold })
    textBox(slide, 'PORTA FINAL', 974, 425, 135, 24, { fontSize: 12, bold: true, color: C.muted })
    footer(slide, 2)
  }

  // 3. Objective
  {
    const slide = darkSlide(presentation); label(slide, 'OBJETIVO'); title(slide, 'A condição de saída')
    addStatement(slide, 'Romper os sete selos', 'Cada selo exige uma resposta matemática e quatro registros de evidência.', 72, 205, 510)
    addStatement(slide, 'Preservar fragmentos', 'A equipe começa com quatro pistas. Cada pista aberta consome um fragmento.', 72, 340, 510, C.gold)
    addStatement(slide, 'Abrir a câmara final', 'As runas, as configurações e a conjunção final formam a chave de contenção.', 72, 475, 510, C.teal)
    textBox(slide, '900', 760, 195, 340, 140, { fontSize: 108, bold: true, color: C.rust })
    textBox(slide, 'pontos possíveis', 780, 333, 300, 36, { fontSize: 25, color: C.muted })
    textBox(slide, '700 nos selos\n200 na câmara final', 780, 420, 330, 90, { fontSize: 28, bold: true, color: C.ink })
    footer(slide, 3)
  }

  // 4. Timing
  {
    const slide = darkSlide(presentation); label(slide, 'DURAÇÃO'); title(slide, 'Ritmo da expedição')
    const stages = [
      ['00–15', 'Entrada e equipes'], ['15–63', 'Selos 1 a 3'], ['63–72', 'Anomalia coletiva'],
      ['72–128', 'Selos 4 a 6'], ['128–149', 'Selo 7'], ['149–170', 'Câmara final'], ['170–180', 'Debrief'],
    ]
    stages.forEach(([time, name], index) => {
      const y = 184 + index * 62
      textBox(slide, time, 74, y, 120, 34, { fontSize: 19, bold: true, color: index === 6 ? C.gold : C.rust })
      rect(slide, 210, y + 14, 20 + index * 85, 3, index === 6 ? C.gold : C.line)
      textBox(slide, name, 250 + index * 85, y, 390, 34, { fontSize: 18, bold: true, color: C.ink })
    })
    footer(slide, 4)
  }

  // 5. Roles
  {
    const slide = darkSlide(presentation); label(slide, 'FORMAÇÃO'); title(slide, 'Quatro responsabilidades')
    const roles = [
      ['CARTÓGRAFO', 'Organiza dados, desenhos e tabelas.', '01'],
      ['DECIFRADOR', 'Conduz cálculos e transformações.', '02'],
      ['CÉTICO', 'Procura contraexemplos e falhas.', '03'],
      ['GUARDIÃO', 'Registra evidências e submete respostas.', '04'],
    ]
    roles.forEach(([name, body, n], index) => {
      const x = 72 + (index % 2) * 580; const y = 190 + Math.floor(index / 2) * 190
      textBox(slide, n, x, y, 70, 70, { fontSize: 44, bold: true, color: C.rust })
      textBox(slide, name, x + 86, y + 2, 420, 34, { fontSize: 22, bold: true })
      textBox(slide, body, x + 86, y + 48, 420, 54, { fontSize: 17, color: C.muted })
      rect(slide, x + 86, y + 121, 390, 2, C.line)
    })
    textBox(slide, 'A equipe pode trocar responsabilidades entre os selos.', 72, 590, 700, 36, { fontSize: 18, color: C.gold })
    footer(slide, 5)
  }

  // 6. Evidence
  {
    const slide = darkSlide(presentation); label(slide, 'PROTOCOLO'); title(slide, 'Toda resposta precisa de quatro evidências')
    const items = [
      ['REPRESENTAÇÃO', 'Conjunto, grafo, tabela, expressão, código ou circuito.'],
      ['RESULTADO', 'A resposta objetiva que a equipe quer validar.'],
      ['TESTE', 'Um caso, linha ou verificação que sustenta o resultado.'],
      ['EXPLICAÇÃO', 'A regra matemática que conecta os registros anteriores.'],
    ]
    items.forEach(([name, body], index) => {
      const y = 186 + index * 103
      textBox(slide, String(index + 1).padStart(2, '0'), 72, y, 58, 48, { fontSize: 29, bold: true, color: C.rust })
      textBox(slide, name, 152, y, 250, 30, { fontSize: 20, bold: true })
      textBox(slide, body, 410, y, 720, 46, { fontSize: 18, color: C.muted })
      rect(slide, 152, y + 62, 980, 2, C.line)
    })
    footer(slide, 6)
  }

  // 7. Score
  {
    const slide = darkSlide(presentation); label(slide, 'PONTUAÇÃO'); title(slide, 'O custo de cada decisão')
    textBox(slide, '100', 72, 188, 180, 100, { fontSize: 76, bold: true, color: C.rust })
    textBox(slide, 'por selo validado', 76, 288, 260, 30, { fontSize: 18, color: C.muted })
    textBox(slide, '200', 450, 188, 200, 100, { fontSize: 76, bold: true, color: C.gold })
    textBox(slide, 'pela chave final', 458, 288, 260, 30, { fontSize: 18, color: C.muted })
    textBox(slide, '4', 845, 188, 120, 100, { fontSize: 76, bold: true, color: C.teal })
    textBox(slide, 'fragmentos de pista', 853, 288, 280, 30, { fontSize: 18, color: C.muted })
    rect(slide, 72, 377, 1060, 2, C.line)
    textBox(slide, 'Tentativas incorretas não retiram pontos. Elas ficam registradas e recebem feedback sem revelar a resposta.', 72, 416, 1060, 72, { fontSize: 23, bold: true })
    textBox(slide, 'O placar ordena pontuação, selo atual e horário de conclusão.', 72, 535, 920, 40, { fontSize: 18, color: C.gold })
    footer(slide, 7)
  }

  // 8. Map
  {
    const slide = darkSlide(presentation); label(slide, 'MAPA'); title(slide, 'As sete câmaras')
    missions.forEach((mission, index) => addSeal(slide, mission.order, '', mission.title, 92 + index * 164, 270, false))
    rect(slide, 126, 302, 986, 3, C.line)
    textBox(slide, 'As câmaras abrem em sequência. Nenhum selo pode ser ignorado.', 72, 510, 950, 44, { fontSize: 24, bold: true })
    textBox(slide, 'A palavra final só aparece quando todas as evidências forem aceitas.', 72, 566, 950, 36, { fontSize: 17, color: C.muted })
    footer(slide, 8)
  }

  // 9. Launch
  {
    const slide = darkSlide(presentation); label(slide, 'INÍCIO'); title(slide, 'Acesso à expedição')
    textBox(slide, '1', 76, 190, 70, 70, { fontSize: 52, bold: true, color: C.rust }); textBox(slide, 'Entre com sua RA', 170, 202, 430, 44, { fontSize: 29, bold: true })
    textBox(slide, '2', 76, 307, 70, 70, { fontSize: 52, bold: true, color: C.rust }); textBox(slide, 'Crie uma equipe ou use o código recebido', 170, 319, 740, 44, { fontSize: 29, bold: true })
    textBox(slide, '3', 76, 424, 70, 70, { fontSize: 52, bold: true, color: C.rust }); textBox(slide, 'Distribua as quatro responsabilidades', 170, 436, 690, 44, { fontSize: 29, bold: true })
    textBox(slide, 'O cronômetro começa quando o professor liberar o acesso.', 72, 579, 840, 38, { fontSize: 18, color: C.gold })
    footer(slide, 9)
  }

  missions.forEach((mission, index) => addMissionSlide(presentation, 10 + index, mission))

  // 17. Anomaly 1
  {
    const slide = darkSlide(presentation); label(slide, 'ANOMALIA COLETIVA'); title(slide, 'A sala perdeu uma premissa')
    textBox(slide, 'Durante quatro minutos, cada equipe recebe uma afirmação incompleta.', 72, 190, 930, 54, { fontSize: 28, bold: true })
    textBox(slide, 'A equipe precisa escrever uma premissa adicional que torne a conclusão inevitável. O Cético deve tentar quebrar a proposta com um contraexemplo.', 72, 288, 930, 110, { fontSize: 23, color: C.muted })
    rect(slide, 72, 454, 720, 3, C.rust)
    textBox(slide, 'Validação coletiva: uma premissa clara + um teste que falhe sem ela.', 72, 483, 930, 60, { fontSize: 21, color: C.gold })
    textBox(slide, '04:00', 940, 445, 220, 90, { fontSize: 64, bold: true, color: C.rust })
    footer(slide, 17, 'EVENTO DE SALA')
  }

  // 18. Interval checkpoint
  {
    const slide = darkSlide(presentation); label(slide, 'CHECKPOINT'); title(slide, 'Três runas já deveriam estar visíveis')
    ;['P', 'A', 'R'].forEach((rune, index) => addSeal(slide, index + 1, rune, missions[index].title, 250 + index * 300, 250, true))
    textBox(slide, 'Se a equipe ainda não abriu o terceiro selo, este é o momento de usar um fragmento.', 190, 490, 900, 50, { fontSize: 22, bold: true })
    textBox(slide, 'Pausa técnica de 5 minutos após a conferência do professor.', 290, 558, 700, 34, { fontSize: 18, color: C.gold })
    footer(slide, 18)
  }

  // 19. Anomaly 2
  {
    const slide = darkSlide(presentation); label(slide, 'ANOMALIA COLETIVA'); title(slide, 'O circuito começou a contar caminhos')
    textBox(slide, 'Uma entrada do circuito pode assumir três estados: 0, 1 ou falha. A outra continua binária.', 72, 186, 970, 58, { fontSize: 28, bold: true })
    textBox(slide, 'Quantas combinações de entrada existem? Como a tabela deveria representar o estado de falha sem confundi-lo com 0?', 72, 292, 970, 98, { fontSize: 23, color: C.muted })
    textBox(slide, 'A resposta precisa usar o princípio multiplicativo e uma convenção explícita de representação.', 72, 470, 930, 66, { fontSize: 21, color: C.gold })
    footer(slide, 19, 'EVENTO DE SALA')
  }

  // 20. Final chamber
  {
    const slide = darkSlide(presentation); label(slide, 'CÂMARA FINAL'); title(slide, 'A chave de contenção')
    const runes = ['P','A','R','A','D','O','X']
    runes.forEach((rune, index) => addSeal(slide, index + 1, rune, '', 122 + index * 150, 224, true))
    textBox(slide, 'A palavra revelada', 88, 392, 330, 34, { fontSize: 20, bold: true, color: C.muted })
    textBox(slide, 'Número de configurações dos sete selos binários', 438, 392, 430, 54, { fontSize: 20, bold: true, color: C.muted })
    textBox(slide, 'Configurações que satisfazem todos os selos simultaneamente', 884, 392, 330, 72, { fontSize: 20, bold: true, color: C.muted })
    textBox(slide, 'FORMATO: PALAVRA-000-0', 348, 548, 590, 48, { fontSize: 31, bold: true, color: C.gold })
    footer(slide, 20)
  }

  // 21. Countdown
  {
    const slide = darkSlide(presentation); label(slide, 'CONTAGEM REGRESSIVA'); title(slide, 'Últimos dez minutos')
    textBox(slide, '10:00', 72, 195, 500, 160, { fontSize: 120, bold: true, color: C.rust })
    textBox(slide, 'A equipe deve escolher agora:', 700, 195, 430, 38, { fontSize: 25, bold: true })
    textBox(slide, 'Continuar investigando\nAbrir a pista do selo atual\nSubmeter a chave final', 700, 265, 430, 170, { fontSize: 27, color: C.muted })
    textBox(slide, 'Nenhum fragmento vale depois que o tempo termina.', 700, 500, 420, 60, { fontSize: 19, color: C.gold })
    footer(slide, 21)
  }

  // 22. Victory
  {
    const slide = darkSlide(presentation); label(slide, 'CONTENÇÃO CONCLUÍDA'); title(slide, 'A porta voltou a obedecer à lógica')
    textBox(slide, 'As sete runas formaram uma palavra. As 128 configurações foram reduzidas a uma única conjunção verdadeira.', 72, 200, 1040, 100, { fontSize: 30, bold: true })
    textBox(slide, 'PARADOX · 128 · 1', 72, 360, 1040, 100, { fontSize: 60, bold: true, color: C.green })
    textBox(slide, 'Registrem a pontuação e aguardem o debrief.', 72, 506, 740, 38, { fontSize: 21, color: C.muted })
    footer(slide, 22)
  }

  // 23. Debrief
  {
    const slide = darkSlide(presentation); label(slide, 'DEBRIEF'); title(slide, 'O que convenceu a equipe?')
    addStatement(slide, 'Evidência decisiva', 'Qual registro eliminou a maior dúvida?', 72, 196, 500)
    addStatement(slide, 'Erro produtivo', 'Qual tentativa incorreta mudou o caminho da equipe?', 72, 340, 500, C.gold)
    addStatement(slide, 'Conexão entre temas', 'Onde dois estúdios apareceram no mesmo raciocínio?', 72, 484, 500, C.teal)
    textBox(slide, '2', 780, 204, 180, 120, { fontSize: 96, bold: true, color: C.rust })
    textBox(slide, 'minutos por equipe', 786, 330, 300, 40, { fontSize: 23, color: C.muted })
    textBox(slide, 'Uma resposta curta. Uma evidência concreta.', 780, 442, 360, 80, { fontSize: 26, bold: true })
    footer(slide, 23)
  }

  // 24. Recognition
  {
    const slide = darkSlide(presentation); label(slide, 'RECONHECIMENTOS'); title(slide, 'Marcas da expedição')
    const awards = [['MAIOR PONTUAÇÃO', 'Domínio dos sete selos'], ['MELHOR CONTRAEXEMPLO', 'O teste que evitou um erro'], ['MELHOR EVIDÊNCIA', 'Clareza entre representação e explicação'], ['COOPERAÇÃO', 'Responsabilidades bem distribuídas']]
    awards.forEach(([name, body], index) => {
      const x = 72 + (index % 2) * 570; const y = 195 + Math.floor(index / 2) * 180
      textBox(slide, '✦', x, y, 50, 50, { fontSize: 31, color: C.gold })
      textBox(slide, name, x + 66, y, 430, 32, { fontSize: 21, bold: true })
      textBox(slide, body, x + 66, y + 45, 430, 50, { fontSize: 17, color: C.muted })
      rect(slide, x + 66, y + 112, 420, 2, C.line)
    })
    footer(slide, 24)
  }

  // 25. Public ending
  {
    const slide = darkSlide(presentation); label(slide, 'FIM DA PROJEÇÃO PÚBLICA'); title(slide, 'Apêndice reservado ao professor')
    textBox(slide, 'As próximas lâminas contêm respostas, critérios de validação e intervenções pedagógicas.', 72, 220, 940, 86, { fontSize: 31, bold: true })
    textBox(slide, 'Interrompa a apresentação aqui se os alunos ainda estiverem na sala.', 72, 362, 900, 54, { fontSize: 24, color: C.red })
    footer(slide, 25, 'ÁREA DO PROFESSOR')
  }

  // 26-28. Answer appendix
  {
    const slide = darkSlide(presentation); label(slide, 'GABARITO · SELOS 1 A 3'); title(slide, 'Primeiro ato')
    addStatement(slide, 'Arquivo Vazio · P', '(A ∪ B) \\ C = {2,3,5,7,11,12}. Cardinalidade 6.', 72, 195, 1040)
    addStatement(slide, 'Corredor dos Vínculos · A', 'Reflexiva e antissimétrica. Não simétrica. Não transitiva. Falta (A,C).', 72, 340, 1040, C.gold)
    addStatement(slide, 'Galeria dos Espelhos · R', 'Função não injetiva e não sobrejetiva. Troque Orfeu ↦ Leste por Orfeu ↦ Oeste.', 72, 485, 1040, C.teal)
    footer(slide, 26, 'APÊNDICE DO PROFESSOR')
  }
  {
    const slide = darkSlide(presentation); label(slide, 'GABARITO · SELOS 4 A 6'); title(slide, 'Segundo ato')
    addStatement(slide, 'Capela das Vozes · A', 'Conclusão ¬p. A fórmula é tautologia. p → q equivale a ¬p ∨ q.', 72, 195, 1040)
    addStatement(slide, 'Autômato Cego · D', '(selo && operador) || (emergencia && guardiao). Saídas 1010.', 72, 340, 1040, C.gold)
    addStatement(slide, 'Sala das Lâmpadas Mortas · O', 'L = (A XOR B) AND NOT I. A lâmpada acende nas entradas 010 e 100.', 72, 485, 1040, C.teal)
    footer(slide, 27, 'APÊNDICE DO PROFESSOR')
  }
  {
    const slide = darkSlide(presentation); label(slide, 'GABARITO · SELO 7 E FINAL'); title(slide, 'Fechamento')
    addStatement(slide, 'Labirinto · X', '5 alternativas. 12 etapas. C(7,3) = 35. Código restrito = 300. Soma = 352.', 72, 195, 1040)
    addStatement(slide, 'Câmara final', 'Runas: PARADOX. Configurações: 2⁷ = 128. Todos os selos verdadeiros: 1.', 72, 340, 1040, C.gold)
    addStatement(slide, 'Chave de contenção', 'PARADOX-128-1', 72, 485, 1040, C.green)
    footer(slide, 28, 'APÊNDICE DO PROFESSOR')
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const png = await presentation.export({ slide, format: 'png', scale: 1 })
    await fs.writeFile(path.join(previewDir, `slide-${String(index + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()))
  }
  const montage = await presentation.export({ format: 'webp', montage: true })
  await fs.writeFile(path.join(buildDir, 'montage.webp'), new Uint8Array(await montage.arrayBuffer()))

  const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href)
  const stagingDir = path.join(buildDir, 'finalizer')
  await fs.mkdir(stagingDir, { recursive: true })
  const candidatePath = path.join(stagingDir, 'candidate.pptx')
  await (await PresentationFile.exportPptx(presentation)).save(candidatePath)
  await finalizePresentation({
    explicitTotalSlideCount: 28,
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    workspaceDir,
    candidatePath,
    finalPath,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_package_integrity.py'),
    layoutValidatorPath: path.join(SKILL_DIR, 'container_tools/inspect_presentation_layout_geometry.py'),
    layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-heading-fit'],
    fontPolicy: { basis: 'design', families: [FONT] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(stagingDir, 'validation.json'),
  })
  console.log(finalPath)
}

build().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
