export const GAME_TITLE = 'O Último Axioma: Os Sete Selos do Paradoxo'

const missions = [
  {
    id: 'arquivo-vazio',
    order: 1,
    seal: 'P',
    title: 'Arquivo Vazio',
    studio: 'Conjuntos',
    duration: 14,
    atmosphere: 'Fichas sem origem surgem em um arquivo que não deveria existir.',
    objective: 'Calcule (A ∪ B) \\ C e registre a cardinalidade do conjunto resultante.',
    brief: {
      universe: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      sets: {
        A: [1, 2, 3, 5, 8, 12],
        B: [2, 4, 5, 7, 8, 11],
        C: [1, 4, 8, 10],
      },
    },
    answerKind: 'set',
    hint: 'Una A e B primeiro. Depois retire cada elemento que também aparece em C.',
  },
  {
    id: 'corredor-vinculos',
    order: 2,
    seal: 'A',
    title: 'Corredor dos Vínculos',
    studio: 'Relações',
    duration: 14,
    atmosphere: 'Retratos ligados por fios mudam quando ninguém os observa.',
    objective: 'Classifique a relação e encontre o par que restaura a transitividade.',
    brief: {
      set: ['A', 'B', 'C', 'D'],
      pairs: ['A,A', 'B,B', 'C,C', 'D,D', 'A,B', 'B,C'],
    },
    answerKind: 'relation',
    hint: 'Se A se liga a B e B se liga a C, a transitividade exige uma ligação direta entre A e C.',
  },
  {
    id: 'galeria-espelhos',
    order: 3,
    seal: 'R',
    title: 'Galeria dos Espelhos',
    studio: 'Funções',
    duration: 14,
    atmosphere: 'Quatro nomes procuram saídas, mas dois reflexos ocupam o mesmo destino.',
    objective: 'Classifique a função e altere apenas uma imagem para obter uma bijeção.',
    brief: {
      domain: ['Iris', 'Nox', 'Orfeu', 'Salma'],
      codomain: ['Norte', 'Leste', 'Sul', 'Oeste'],
      mapping: ['Iris→Leste', 'Nox→Sul', 'Orfeu→Leste', 'Salma→Norte'],
    },
    answerKind: 'function',
    hint: 'Leste recebe duas entradas e Oeste não recebe nenhuma. Uma única troca resolve os dois problemas.',
  },
  {
    id: 'capela-vozes',
    order: 4,
    seal: 'A',
    title: 'Capela das Vozes',
    studio: 'Lógica, tabelas-verdade e equivalências',
    duration: 18,
    atmosphere: 'Uma voz promete a abertura. Outra garante que ela não ocorreu.',
    objective: 'Identifique a conclusão válida, classifique a fórmula e complete a equivalência.',
    brief: {
      premises: ['p → q', '¬q'],
      formula: '((p → q) ∧ ¬q) → ¬p',
      equivalence: 'p → q ≡ ?'
    },
    answerKind: 'logic',
    hint: 'Use modus tollens. Para eliminar uma implicação, combine a negação do antecedente com o consequente.',
  },
  {
    id: 'automato-cego',
    order: 5,
    seal: 'D',
    title: 'Autômato Cego',
    studio: 'Lógica em algoritmos',
    duration: 16,
    atmosphere: 'O autômato executa qualquer regra, inclusive uma regra escrita com precedência errada.',
    objective: 'Escolha o predicado correto e informe a sequência de saídas dos quatro testes.',
    brief: {
      variables: ['selo', 'operador', 'emergencia', 'guardiao'],
      rule: 'abre = (selo && operador) || (emergencia && guardiao)',
      tests: ['1100', '1010', '0011', '0110'],
    },
    answerKind: 'algorithm',
    hint: 'Calcule cada conjunção separadamente. A porta abre quando pelo menos um dos dois grupos é verdadeiro.',
  },
  {
    id: 'lampadas-mortas',
    order: 6,
    seal: 'O',
    title: 'Sala das Lâmpadas Mortas',
    studio: 'Circuitos digitais',
    duration: 16,
    atmosphere: 'Duas chaves disputam um sinal enquanto um inibidor apaga toda a sala.',
    objective: 'Escreva a expressão do circuito e selecione as entradas que acendem a lâmpada.',
    brief: {
      expression: 'L = (A XOR B) AND NOT I',
      inputOrder: 'ABI',
      rows: ['000', '001', '010', '011', '100', '101', '110', '111'],
    },
    answerKind: 'circuit',
    hint: 'XOR vale 1 quando A e B são diferentes. O inibidor precisa estar desligado.',
  },
  {
    id: 'labirinto-possibilidades',
    order: 7,
    seal: 'X',
    title: 'Labirinto das Possibilidades',
    studio: 'Princípios de contagem',
    duration: 16,
    atmosphere: 'Cada escolha multiplica os corredores. Alguns caminhos só podem ser somados.',
    objective: 'Calcule as cinco quantidades e encontre a soma que revela o último selo.',
    brief: {
      questions: [
        '2 rotas externas ou 3 túneis internos',
        '3 portas seguidas por 4 chaves',
        'Escolha 3 símbolos entre 7',
        'Código de 3 dígitos sem repetição, primeiro dígito não nulo',
        'Soma dos quatro resultados anteriores',
      ],
    },
    answerKind: 'counting',
    hint: 'Use soma para alternativas excludentes, produto para etapas sucessivas e combinação quando a ordem não importa.',
  },
]

export const publicMissions = missions.map(({ hint: _hint, ...mission }) => mission)

const normalizeText = (value) => String(value ?? '').trim().toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')
const normalizeNumberArray = (value) => Array.isArray(value) ? value.map(Number).filter(Number.isFinite).sort((a, b) => a - b) : []
const normalizeStringArray = (value) => Array.isArray(value) ? value.map(normalizeText).filter(Boolean).sort() : []
const sameArray = (left, right) => left.length === right.length && left.every((value, index) => value === right[index])

export function validateMissionAnswer(missionId, answer) {
  const mission = missions.find((item) => item.id === missionId)
  if (!mission) return { correct: false, feedback: 'Selo desconhecido.' }

  let correct = false
  switch (mission.answerKind) {
    case 'set':
      correct = sameArray(normalizeNumberArray(answer?.elements), [2, 3, 5, 7, 11, 12]) && Number(answer?.cardinality) === 6
      break
    case 'relation': {
      const properties = normalizeStringArray(answer?.properties)
      correct = sameArray(properties, ['ANTISSIMETRICA', 'REFLEXIVA']) && ['A,C', '(A,C)', 'AC'].includes(normalizeText(answer?.missingPair))
      break
    }
    case 'function':
      correct = normalizeText(answer?.classification) === 'FUNCAONAO-INJETIVAENAO-SOBREJETIVA' ||
        normalizeText(answer?.classification) === 'NAOINJETIVAENAOSOBREJETIVA'
      correct = correct && ['ORFEU→OESTE', 'ORFEU->OESTE', 'ORFEU,OESTE'].includes(normalizeText(answer?.repair))
      break
    case 'logic':
      correct = normalizeText(answer?.conclusion) === '¬P' && normalizeText(answer?.formulaClass) === 'TAUTOLOGIA' &&
        ['¬P∨Q', '!P||Q', 'NAOPMOQ'].includes(normalizeText(answer?.equivalence))
      break
    case 'algorithm':
      correct = normalizeText(answer?.predicate) === '(SELO&&OPERADOR)||(EMERGENCIA&&GUARDIAO)' && normalizeText(answer?.outputs) === '1010'
      break
    case 'circuit': {
      const expression = normalizeText(answer?.expression).replaceAll('⊕', 'XOR').replaceAll('∧', 'AND').replaceAll('¬', 'NOT')
      const expressionOk = expression.includes('AXORB') && expression.includes('NOTI') && expression.includes('AND')
      correct = expressionOk && sameArray(normalizeStringArray(answer?.activeRows), ['010', '100'])
      break
    }
    case 'counting':
      correct = Number(answer?.additive) === 5 && Number(answer?.multiplicative) === 12 && Number(answer?.combination) === 35 &&
        Number(answer?.constrained) === 300 && Number(answer?.total) === 352
      break
  }

  return {
    correct,
    feedback: correct
      ? `O selo ${mission.seal} respondeu. A equipe pode avançar.`
      : 'A evidência ainda não fecha o selo. Revise a operação e teste um caso que possa contrariar sua resposta.',
    seal: correct ? mission.seal : undefined,
  }
}

export function validateFinalKey(value) {
  return normalizeText(value).replaceAll('_', '-') === 'PARADOX-128-1'
}

export function getMissionHint(missionId) {
  return missions.find((item) => item.id === missionId)?.hint ?? null
}

export function assertEvidence(input) {
  const evidence = input && typeof input === 'object' ? input : {}
  const required = ['representation', 'result', 'test', 'explanation']
  const missing = required.filter((key) => String(evidence[key] ?? '').trim().length < 4)
  if (missing.length) {
    const error = new Error('Registre representação, resultado, teste e explicação antes de validar.')
    error.code = 'INCOMPLETE_EVIDENCE'
    error.status = 400
    throw error
  }
  return Object.fromEntries(required.map((key) => [key, String(evidence[key]).trim().slice(0, 1200)]))
}
