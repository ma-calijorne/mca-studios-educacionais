import type { Mode, TopicId } from './types'

export interface HowToStep {
  title: string
  description: string
}

export interface HowToGuide {
  headline: string
  summary: string
  goal: string
  steps: HowToStep[]
  modes: Record<Mode, string>
  tips: string[]
}

const sharedModes = {
  learn: 'Siga a missão guiada, registre uma previsão e compare-a com a evidência.',
  explore: 'Parta de um cenário pronto e altere uma condição por vez para observar o efeito.',
  sandbox: 'Crie seus próprios exemplos e teste hipóteses sem um objetivo obrigatório.',
  challenges: 'Resolva uma situação com critérios de sucesso e use as pistas quando precisar.',
} satisfies Record<Mode, string>

export const howToGuides: Record<TopicId, HowToGuide> = {
  sets: {
    headline: 'Organize elementos e acompanhe a pertença',
    summary: 'Use os cartões para decidir em quais conjuntos cada elemento aparece e veja o resultado da operação escolhida.',
    goal: 'Compreender união, interseção, diferença e complemento pela pertença de cada elemento.',
    steps: [
      { title: 'Escolha uma operação', description: 'Use o seletor do laboratório para definir como A e B serão combinados.' },
      { title: 'Selecione um elemento', description: 'Clique em um cartão e altere sua pertença a A ou B.' },
      { title: 'Faça uma previsão', description: 'Antes de analisar, diga se o elemento destacado aparecerá no resultado.' },
      { title: 'Leia a justificativa', description: 'Compare as pertenças individuais com a regra formal da operação.' },
    ],
    modes: sharedModes,
    tips: ['As pequenas marcas A e B mostram a pertença atual.', 'No Sandbox, pressione Enter para adicionar um elemento.'],
  },
  relations: {
    headline: 'Construa vínculos e investigue propriedades',
    summary: 'Cada seta representa um par ordenado. Edite a rede e observe quais pares sustentam ou violam uma propriedade.',
    goal: 'Reconhecer reflexividade, simetria, antissimetria e transitividade por evidências concretas.',
    steps: [
      { title: 'Leia a rede', description: 'Os nós são elementos e cada seta x→y representa o par (x, y).' },
      { title: 'Adicione ou remova pares', description: 'Use o compositor de pares ou selecione uma seta para alterar a relação.' },
      { title: 'Escolha uma propriedade', description: 'Mude o foco da investigação no painel lateral.' },
      { title: 'Inspecione a evidência', description: 'O sistema destaca testemunhos, pares ausentes e contraexemplos.' },
    ],
    modes: sharedModes,
    tips: ['Transitividade procura uma cadeia x→y→z e verifica x→z.', 'Use Desfazer para comparar duas versões da rede.'],
  },
  functions: {
    headline: 'Conecte entradas e saídas',
    summary: 'As linhas mostram atribuições do domínio ao contradomínio. Modifique-as para testar existência, unicidade e cobertura.',
    goal: 'Distinguir função, injeção, sobrejeção e bijeção pela estrutura das conexões.',
    steps: [
      { title: 'Observe domínio e contradomínio', description: 'A coluna esquerda contém entradas; a direita, saídas possíveis.' },
      { title: 'Crie uma atribuição', description: 'Selecione uma entrada e indique a saída que ela deve alcançar.' },
      { title: 'Preveja a classificação', description: 'Decida se o diagrama representa uma função antes de revelar a análise.' },
      { title: 'Separe os critérios', description: 'Confira existência, unicidade, injeção e cobertura individualmente.' },
    ],
    modes: sharedModes,
    tips: ['Toda entrada precisa de exatamente uma saída para existir uma função.', 'Uma saída sem seta é relevante para a sobrejeção.'],
  },
  logic: {
    headline: 'Avalie expressões passo a passo',
    summary: 'Altere os valores das proposições e acompanhe como cada conectivo contribui para o resultado final.',
    goal: 'Relacionar conectivos, valores lógicos e a ordem de avaliação de uma expressão.',
    steps: [
      { title: 'Leia a expressão', description: 'Identifique as proposições e os conectivos usados no cenário.' },
      { title: 'Defina os valores', description: 'Alterne cada proposição entre verdadeiro e falso.' },
      { title: 'Antecipe o resultado', description: 'Registre a previsão antes de executar a avaliação.' },
      { title: 'Siga o rastro', description: 'Leia as subexpressões na ordem em que foram resolvidas.' },
    ],
    modes: sharedModes,
    tips: ['Parênteses definem qual subexpressão é resolvida primeiro.', 'Troque apenas uma variável para localizar a causa de uma mudança.'],
  },
  'truth-tables': {
    headline: 'Teste todos os mundos possíveis',
    summary: 'O gerador cria uma linha para cada valoração e permite comparar hipóteses locais com o padrão global.',
    goal: 'Construir tabelas-verdade e classificar expressões como tautologia, contradição ou contingência.',
    steps: [
      { title: 'Informe a expressão', description: 'Use símbolos como ¬, ∧, ∨, → e ↔ no campo de expressão.' },
      { title: 'Arrisque cada linha', description: 'Clique na hipótese de uma linha para alternar entre V e F.' },
      { title: 'Classifique o conjunto', description: 'Escolha o comportamento global antes de revelar os resultados.' },
      { title: 'Compare todos os casos', description: 'Conte quantas linhas são verdadeiras e verifique a classificação.' },
    ],
    modes: sharedModes,
    tips: ['Cada variável adicional dobra o número de linhas.', 'Uma única linha falsa já impede que a expressão seja tautológica.'],
  },
  equivalences: {
    headline: 'Transforme sem mudar o significado',
    summary: 'Aplique uma lei lógica por vez e mantenha um histórico verificável de cada transformação.',
    goal: 'Usar leis de equivalência como regras locais de reescrita e justificar uma simplificação.',
    steps: [
      { title: 'Compare expressão e objetivo', description: 'Observe o estado atual e o tipo de transformação procurada.' },
      { title: 'Escolha uma lei aplicável', description: 'As opções indicam onde uma equivalência pode ser usada.' },
      { title: 'Aplique uma transformação', description: 'A expressão muda, mas conserva o mesmo valor lógico.' },
      { title: 'Revise a prova', description: 'Use o histórico ou Desfazer para verificar cada passagem.' },
    ],
    modes: sharedModes,
    tips: ['Uma transformação correta preserva todas as linhas da tabela-verdade.', 'No Sandbox, carregue sua própria expressão.'],
  },
  'logic-algorithms': {
    headline: 'Transforme condições em comportamento',
    summary: 'O depurador conecta variáveis lógicas, uma condição de código e o ramo executado pelo algoritmo.',
    goal: 'Entender como expressões booleanas controlam decisões em programas.',
    steps: [
      { title: 'Defina o estado de entrada', description: 'Alterne os predicados disponíveis no painel esquerdo.' },
      { title: 'Leia a condição', description: 'Compare a expressão matemática com sua forma em JavaScript.' },
      { title: 'Preveja o ramo', description: 'Escolha permitir ou bloquear antes da execução.' },
      { title: 'Depure o resultado', description: 'Siga o rastro das subcondições até a decisão final.' },
    ],
    modes: sharedModes,
    tips: ['O operador && representa conjunção; || representa disjunção.', 'Altere uma entrada por vez para depurar com clareza.'],
  },
  'digital-circuits': {
    headline: 'Monte, energize e analise circuitos',
    summary: 'Arraste componentes para a bancada, conecte seus terminais e veja os sinais percorrerem as portas.',
    goal: 'Aplicar álgebra booleana em circuitos e relacionar portas, expressões e tabelas-verdade.',
    steps: [
      { title: 'Adicione componentes', description: 'Arraste ou clique em switches, constantes, portas e lâmpadas na paleta.' },
      { title: 'Faça as conexões', description: 'Ligue uma saída a uma entrada arrastando entre os terminais circulares.' },
      { title: 'Teste os sinais', description: 'Alterne os switches e acompanhe os fios e as saídas.' },
      { title: 'Analise um trecho', description: 'Clique em Analisar seleção, escolha uma porta e gere sua tabela-verdade.' },
    ],
    modes: sharedModes,
    tips: ['Selecione um componente ou fio e pressione Delete para removê-lo.', 'Sinais X indicam entrada flutuante, conflito ou circuito ainda indefinido.'],
  },
  counting: {
    headline: 'Construa e meça espaços de possibilidades',
    summary: 'Modele etapas, alternativas, ordenações e seleções; depois compare árvore, resultados e fórmula.',
    goal: 'Escolher o princípio de contagem adequado e relacioná-lo ao tamanho de um espaço de busca.',
    steps: [
      { title: 'Modele as escolhas', description: 'Cada cartão representa uma etapa, alternativa ou conjunto de elementos.' },
      { title: 'Faça uma previsão', description: 'Estime o total antes de permitir que o sistema calcule.' },
      { title: 'Troque a visualização', description: 'Use Etapas, Árvore, Resultados e Fórmula para olhar o mesmo problema.' },
      { title: 'Explique a regra', description: 'Verifique se usamos soma, produto, permutação, arranjo ou combinação.' },
    ],
    modes: sharedModes,
    tips: ['Pergunte primeiro se as escolhas são sucessivas ou exclusivas.', 'Para escolher entre arranjo e combinação, decida se a ordem importa.'],
  },
}
