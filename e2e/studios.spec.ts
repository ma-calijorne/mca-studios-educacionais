import { expect, test } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByLabel('Registro Acadêmico (RA)').fill('TESTE001')
  await page.getByRole('button', { name: 'Entrar no laboratório' }).click()
}

const studios = [
  ['sets', 'Quem pertence ao resultado?'],
  ['relations', 'A cadeia está completa?'],
  ['functions', 'Cada entrada sabe para onde ir?'],
  ['logic', 'Da frase ao valor lógico'],
  ['truth-tables', 'E se testarmos todos os mundos?'],
  ['equivalences', 'Transforme sem mudar o significado'],
  ['logic-algorithms', 'Quando a lógica vira comportamento'],
  ['digital-circuits', 'O que precisa ser verdadeiro para a lâmpada acender?'],
  ['counting', 'Quantos caminhos cabem em uma escolha?'],
] as const

const guides = [
  ['sets', 'Organize elementos e acompanhe a pertença'],
  ['relations', 'Construa vínculos e investigue propriedades'],
  ['functions', 'Conecte entradas e saídas'],
  ['logic', 'Avalie expressões passo a passo'],
  ['truth-tables', 'Teste todos os mundos possíveis'],
  ['equivalences', 'Transforme sem mudar o significado'],
  ['logic-algorithms', 'Transforme condições em comportamento'],
  ['digital-circuits', 'Monte, energize e analise circuitos'],
  ['counting', 'Construa e meça espaços de possibilidades'],
] as const

for (const [path, heading] of studios) {
  test(`${path} opens its learning experience`, async ({ page }) => {
    await login(page)
    await page.goto(`/${path}/learn`)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  })
}

for (const [path, heading] of guides) {
  test(`${path} exposes its own how-to page`, async ({ page }) => {
    await login(page)
    await page.goto(`/${path}/learn`)
    await page.getByRole('link', { name: 'Como usar' }).click()
    await expect(page).toHaveURL(new RegExp(`/${path}/how-to`))
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  })
}

test('prediction unlocks relation evidence', async ({ page }) => {
  await login(page)
  await page.goto('/relations/learn')
  await page.getByRole('button', { name: 'Não' }).click()
  await page.getByRole('button', { name: 'Registrar e analisar' }).click()
  await expect(page.getByText('Revisada pela evidência')).toBeVisible()
  await expect(page.getByText('Falta Ana→Carla')).toBeVisible()
})

test('inactive or unknown RA stays outside the laboratory', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Registro Acadêmico (RA)').fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Entrar no laboratório' }).click()
  await expect(page.getByRole('alert')).toHaveText('RA não encontrada ou inativa.')
})

test('digital circuit propagates signals and analyzes a selected gate', async ({ page }) => {
  await login(page)
  await page.goto('/digital-circuits/learn')
  await page.getByRole('button', { name: 'Não' }).click()
  await page.getByRole('button', { name: 'Registrar e analisar' }).click()
  await expect(page.getByText('0 · desligado')).toBeVisible()

  await page.getByRole('button', { name: 'Alternar Botão pressionado' }).click()
  await expect(page.getByText('1 · ligado')).toBeVisible()

  await page.getByRole('button', { name: 'Analisar seleção' }).click()
  await page.locator('.react-flow__node-gate').click()
  await expect(page.getByRole('heading', { name: 'Comportamento do trecho' })).toBeVisible()
  await expect(page.locator('.circuit-truth-table tbody tr')).toHaveCount(4)
})

test('counting studio turns a prediction into paths and a derivation', async ({ page }) => {
  await login(page)
  await page.goto('/counting/learn')
  await page.getByLabel('Sua previsão').fill('6')
  await page.getByRole('button', { name: 'Registrar e analisar' }).click()
  await expect(page.getByText('Previsão confirmada')).toBeVisible()
  await expect(page.getByText('3 × 2 = 6')).toBeVisible()
  await page.getByRole('tab', { name: 'Resultados' }).click()
  await expect(page.getByText('Azul · Jeans')).toBeVisible()
  await expect(page.getByText('Preta · Sarja')).toBeVisible()
})
