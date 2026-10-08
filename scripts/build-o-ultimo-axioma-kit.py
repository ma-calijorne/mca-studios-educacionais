from __future__ import annotations

import os
from pathlib import Path
from textwrap import wrap

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "artifacts" / "O_Ultimo_Axioma_Kit_Impressao.pdf"
HERO = ROOT / "artifacts" / "assets" / "o-ultimo-axioma-hero.png"
PAGE_W, PAGE_H = A4
MM = 72 / 25.4

INK = HexColor("#211D22")
MUTED = HexColor("#706762")
RUST = HexColor("#B95331")
GOLD = HexColor("#B68142")
TEAL = HexColor("#2D8587")
GREEN = HexColor("#367A52")
RED = HexColor("#A7443B")
PAPER = HexColor("#FBF8F3")
PANEL = HexColor("#F0E9E2")
LINE = HexColor("#D7CBC2")
DARK = HexColor("#111014")

FONT_PATH = "/Library/Fonts/Arial Unicode.ttf"
if not Path(FONT_PATH).exists():
    FONT_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf"
pdfmetrics.registerFont(TTFont("Axiom", FONT_PATH))


def text_lines(c: canvas.Canvas, text: str, x: float, y: float, max_width: float,
               size: float = 10, leading: float | None = None, color=INK,
               font: str = "Axiom", max_lines: int | None = None) -> float:
    leading = leading or size * 1.35
    c.setFont(font, size)
    c.setFillColor(color)
    lines: list[str] = []
    for paragraph in str(text).split("\n"):
        if not paragraph:
            lines.append("")
            continue
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".") + "..."
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def page_base(c: canvas.Canvas, page: int, section: str, title: str, subtitle: str = "") -> float:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(RUST)
    c.rect(0, PAGE_H - 8 * MM, PAGE_W, 8 * MM, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Axiom", 7.5)
    c.drawString(18 * MM, PAGE_H - 18 * MM, section.upper())
    text_lines(c, title, 18 * MM, PAGE_H - 31 * MM, PAGE_W - 36 * MM, 22, 25, INK)
    if subtitle:
        text_lines(c, subtitle, 18 * MM, PAGE_H - 43 * MM, PAGE_W - 36 * MM, 9.5, 13, MUTED)
    c.setStrokeColor(LINE)
    c.line(18 * MM, 16 * MM, PAGE_W - 18 * MM, 16 * MM)
    c.setFillColor(MUTED)
    c.setFont("Axiom", 7)
    c.drawString(18 * MM, 10.8 * MM, "O Último Axioma - Matemática Computacional Aplicada")
    c.drawRightString(PAGE_W - 18 * MM, 10.8 * MM, f"{page:02d}")
    return PAGE_H - 55 * MM


def section_heading(c: canvas.Canvas, value: str, x: float, y: float, width: float) -> float:
    c.setFillColor(RUST)
    c.rect(x, y - 3, 3, 15, fill=1, stroke=0)
    c.setFont("Axiom", 10)
    c.setFillColor(INK)
    c.drawString(x + 9, y, value.upper())
    c.setStrokeColor(LINE)
    c.line(x + 9, y - 7, x + width, y - 7)
    return y - 20


def numbered_item(c: canvas.Canvas, number: str, title: str, body: str, x: float, y: float, width: float) -> float:
    c.setFillColor(RUST)
    c.circle(x + 9, y - 3, 9, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Axiom", 8)
    c.drawCentredString(x + 9, y - 6, number)
    c.setFillColor(INK)
    c.setFont("Axiom", 10)
    c.drawString(x + 27, y + 1, title)
    return text_lines(c, body, x + 27, y - 14, width - 27, 8.5, 11.5, MUTED) - 8


def draw_card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str, body: str,
              kicker: str = "", accent=RUST, number: str = "") -> None:
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(accent)
    c.rect(x, y + h - 5, w, 5, fill=1, stroke=0)
    if number:
        c.setFillColor(accent)
        c.setFont("Axiom", 30)
        c.drawString(x + 13, y + h - 41, number)
        tx = x + 57
    else:
        tx = x + 13
    if kicker:
        c.setFillColor(accent)
        c.setFont("Axiom", 6.5)
        c.drawString(tx, y + h - 20, kicker.upper())
    c.setFillColor(INK)
    c.setFont("Axiom", 11)
    c.drawString(tx, y + h - 38, title)
    text_lines(c, body, x + 13, y + h - 59, w - 26, 8, 10.6, MUTED)


def lines_box(c: canvas.Canvas, x: float, y: float, w: float, h: float, label: str, rows: int = 4) -> None:
    c.setStrokeColor(LINE)
    c.setFillColor(white)
    c.roundRect(x, y, w, h, 5, fill=1, stroke=1)
    c.setFillColor(MUTED)
    c.setFont("Axiom", 7.5)
    c.drawString(x + 9, y + h - 14, label.upper())
    c.setStrokeColor(HexColor("#E8DFD8"))
    for idx in range(rows):
        yy = y + 12 + idx * ((h - 31) / max(rows - 1, 1))
        c.line(x + 9, yy, x + w - 9, yy)


missions = [
    {
        "number": "1", "rune": "P", "title": "Arquivo Vazio", "studio": "Conjuntos", "minutes": "14 min",
        "story": "Fichas sem origem surgem em um arquivo que não deveria existir.",
        "objective": "Calcule (A união B) menos C e registre a cardinalidade do conjunto resultante.",
        "data": "U = {1, 2, ..., 12}\nA = {1,2,3,5,8,12}\nB = {2,4,5,7,8,11}\nC = {1,4,8,10}",
        "fields": ["Elementos do resultado", "Cardinalidade"],
        "answer": "Resultado: {2,3,5,7,11,12}. Cardinalidade: 6.",
        "criterion": "A equipe deve representar a união antes de retirar os elementos de C.",
    },
    {
        "number": "2", "rune": "A", "title": "Corredor dos Vínculos", "studio": "Relações", "minutes": "14 min",
        "story": "Retratos ligados por fios mudam quando ninguém os observa.",
        "objective": "Classifique a relação e encontre o par que restaura a transitividade.",
        "data": "S = {A,B,C,D}\nR contém os quatro laços e os pares (A,B) e (B,C).",
        "fields": ["Propriedades válidas", "Par que falta"],
        "answer": "Reflexiva e antissimétrica. Não simétrica. Não transitiva. Falta (A,C).",
        "criterion": "Aceite a classificação apenas quando houver um teste para cada propriedade.",
    },
    {
        "number": "3", "rune": "R", "title": "Galeria dos Espelhos", "studio": "Funções", "minutes": "14 min",
        "story": "Dois reflexos ocupam o mesmo destino enquanto uma saída permanece vazia.",
        "objective": "Classifique a função e altere apenas uma imagem para obter uma bijeção.",
        "data": "Iris -> Leste\nNox -> Sul\nOrfeu -> Leste\nSalma -> Norte\nContradomínio: Norte, Leste, Sul, Oeste",
        "fields": ["Classificação atual", "Reparo de uma imagem"],
        "answer": "Não injetiva e não sobrejetiva. Troque Orfeu -> Leste por Orfeu -> Oeste.",
        "criterion": "A equipe deve identificar a colisão em Leste e a ausência de imagem em Oeste.",
    },
    {
        "number": "4", "rune": "A", "title": "Capela das Vozes", "studio": "Lógica, tabelas e equivalências", "minutes": "18 min",
        "story": "Uma voz promete a abertura. Outra garante que ela não ocorreu.",
        "objective": "Encontre a conclusão, classifique a fórmula e complete a equivalência.",
        "data": "Premissas: p -> q e não q\nFórmula: ((p -> q) e não q) -> não p\nEquivalência: p -> q equivale a ?",
        "fields": ["Conclusão e regra", "Classe da fórmula", "Equivalência"],
        "answer": "Conclusão: não p, por modus tollens. Fórmula: tautologia. Equivalência: não p ou q.",
        "criterion": "Peça uma linha crítica da tabela ou uma derivação válida para justificar.",
    },
    {
        "number": "5", "rune": "D", "title": "Autômato Cego", "studio": "Lógica em algoritmos", "minutes": "16 min",
        "story": "O autômato executa qualquer regra, inclusive uma regra com precedência errada.",
        "objective": "Escolha o predicado correto e informe a sequência dos quatro testes.",
        "data": "abre = (selo && operador) || (emergencia && guardiao)\nTestes: 1100, 1010, 0011, 0110\nOrdem: selo, operador, emergencia, guardiao",
        "fields": ["Predicado escolhido", "Saídas dos quatro testes"],
        "answer": "Predicado conforme enunciado. Saídas: 1010.",
        "criterion": "A equipe deve rastrear as duas conjunções antes de aplicar a disjunção.",
    },
    {
        "number": "6", "rune": "O", "title": "Sala das Lâmpadas Mortas", "studio": "Circuitos digitais", "minutes": "16 min",
        "story": "Duas chaves disputam um sinal enquanto um inibidor apaga toda a sala.",
        "objective": "Escreva a expressão do circuito e encontre as entradas que acendem a lâmpada.",
        "data": "A e B alimentam uma porta XOR.\nI passa por uma porta NOT.\nOs dois sinais alimentam uma porta AND que produz L.",
        "fields": ["Expressão booleana", "Linhas ABI com L = 1"],
        "answer": "L = (A XOR B) AND NOT I. Linhas ABI: 010 e 100.",
        "criterion": "Aceite apenas quando a tabela considerar as oito combinações de entrada.",
    },
    {
        "number": "7", "rune": "X", "title": "Labirinto das Possibilidades", "studio": "Princípios de contagem", "minutes": "16 min",
        "story": "Cada escolha multiplica os corredores. Alguns caminhos só podem ser somados.",
        "objective": "Resolva as quatro contagens e some os resultados.",
        "data": "1. Duas rotas externas ou três túneis internos.\n2. Três portas seguidas por quatro chaves.\n3. Escolha três símbolos entre sete.\n4. Código de três dígitos sem repetição, primeiro dígito não nulo.",
        "fields": ["Resultados 1 a 4", "Soma final"],
        "answer": "5; 12; C(7,3) = 35; 300. Soma: 352.",
        "criterion": "A equipe deve nomear quando usa soma, produto, combinação e contagem restrita.",
    },
]


def build_pdf() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
    c.setTitle("O Último Axioma - Kit de Impressão")
    c.setAuthor("MCA Studios Educacionais")
    c.setSubject("Jogo integrador de Matemática Computacional Aplicada")
    page = 1

    # 1. Cover
    hero = ImageReader(str(HERO))
    hero_width, hero_height = hero.getSize()
    scale = max(PAGE_W / hero_width, PAGE_H / hero_height)
    draw_width, draw_height = hero_width * scale, hero_height * scale
    c.drawImage(hero, (PAGE_W - draw_width) / 2, (PAGE_H - draw_height) / 2, draw_width, draw_height)
    c.setFillColor(DARK)
    c.rect(0, 0, PAGE_W * 0.62, PAGE_H, fill=1, stroke=0)
    c.setFillColor(RUST)
    c.rect(18 * MM, PAGE_H - 46 * MM, 42 * MM, 2 * MM, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Axiom", 8)
    c.drawString(18 * MM, PAGE_H - 30 * MM, "EVENTO INTEGRADOR - MATEMÁTICA COMPUTACIONAL")
    text_lines(c, "O Último\nAxioma", 18 * MM, PAGE_H - 70 * MM, 150 * MM, 38, 42, white)
    text_lines(c, "Os Sete Selos do Paradoxo", 18 * MM, PAGE_H - 110 * MM, 150 * MM, 17, 21, HexColor("#E2B77A"))
    text_lines(c, "Kit de impressão do professor", 18 * MM, 33 * MM, 130 * MM, 10, 13, HexColor("#D4CAC4"))
    c.setFont("Axiom", 7)
    c.drawRightString(PAGE_W - 18 * MM, 16 * MM, "31 páginas")
    c.showPage(); page += 1

    # 2. Teacher guide
    y = page_base(c, page, "Guia do professor", "Visão rápida", "Use este kit junto com a aplicação e a apresentação projetada.")
    y = numbered_item(c, "1", "Antes da aula", "Imprima as páginas 8 a 23 conforme o número de equipes. Abra a área administrativa e mantenha o jogo bloqueado.", 18 * MM, y, 174 * MM)
    y = numbered_item(c, "2", "Na abertura", "Apresente o prólogo, forme equipes de quatro pessoas e distribua as responsabilidades.", 18 * MM, y, 174 * MM)
    y = numbered_item(c, "3", "Liberação", "Use apenas o toggle O Último Axioma na administração. A ativação cria a expedição automaticamente.", 18 * MM, y, 174 * MM)
    y = numbered_item(c, "4", "Durante o jogo", "Acompanhe o placar e intervenha apenas quando a equipe registrar as quatro evidências.", 18 * MM, y, 174 * MM)
    y = numbered_item(c, "5", "Encerramento", "Projete a tela de vitória, faça o debrief e use o gabarito reservado deste kit.", 18 * MM, y, 174 * MM)
    c.showPage(); page += 1

    # 3. Setup
    y = page_base(c, page, "Preparação", "Checklist da sala", "Configuração recomendada para uma sessão de 180 minutos.")
    checks = [
        "Computador do professor conectado ao projetor.", "URL run.app aberta e login administrativo testado.",
        "RAs ativas e conferidas na administração.", "Apresentação aberta na lâmina 1.",
        "Uma folha de equipe por grupo.", "Duas folhas de evidência por equipe.",
        "Cartões de responsabilidade recortados.", "Cartões de pista e anomalia separados.",
        "Toggle do jogo inicialmente desligado.", "Relógio de sala visível.",
    ]
    for idx, item in enumerate(checks):
        col = idx % 2; row = idx // 2
        x = 18 * MM + col * 88 * MM; yy = y - row * 24 * MM
        c.setStrokeColor(RUST); c.rect(x, yy - 5, 5 * MM, 5 * MM, fill=0, stroke=1)
        text_lines(c, item, x + 9 * MM, yy + 5, 75 * MM, 9, 12, INK, max_lines=2)
    c.showPage(); page += 1

    # 4. Schedule
    y = page_base(c, page, "Condução", "Cronograma de 180 minutos", "Adapte o intervalo, mas preserve pelo menos 25 minutos para a câmara final e o debrief.")
    stages = [("00-15", "Abertura, equipes e responsabilidades"), ("15-63", "Selos 1 a 3"), ("63-72", "Primeira anomalia coletiva"), ("72-77", "Pausa técnica"), ("77-128", "Selos 4 a 6"), ("128-149", "Selo 7"), ("149-170", "Câmara final"), ("170-180", "Debrief e reconhecimentos")]
    for idx, (time, name) in enumerate(stages):
        yy = y - idx * 22 * MM
        c.setFillColor(RUST if idx < 7 else GREEN); c.roundRect(18 * MM, yy - 5 * MM, 28 * MM, 10 * MM, 4, fill=1, stroke=0)
        c.setFillColor(white); c.setFont("Axiom", 9); c.drawCentredString(32 * MM, yy - 1.5 * MM, time)
        c.setFillColor(INK); c.setFont("Axiom", 10); c.drawString(53 * MM, yy - 1.5 * MM, name)
        c.setStrokeColor(LINE); c.line(53 * MM, yy - 6 * MM, 190 * MM, yy - 6 * MM)
    c.showPage(); page += 1

    # 5. Rules
    y = page_base(c, page, "Regras", "Protocolo de contenção", "Leia estas regras em voz alta antes de liberar o acesso.")
    rules = [
        ("01", "A equipe avança em sequência; nenhum selo pode ser ignorado."),
        ("02", "Toda submissão exige previsão, representação, resultado, teste e explicação."),
        ("03", "Tentativas incorretas não retiram pontos, mas ficam registradas."),
        ("04", "Cada equipe recebe quatro fragmentos; uma pista consome um fragmento."),
        ("05", "Os integrantes podem trocar responsabilidades entre os selos."),
        ("06", "A chave final só aparece depois dos sete selos validados."),
        ("07", "O professor encerra a sessão quando o tempo termina."),
    ]
    for idx, (num, body) in enumerate(rules):
        y = numbered_item(c, num, "", body, 18 * MM, y, 174 * MM)
    c.showPage(); page += 1

    # 6. Scoring
    y = page_base(c, page, "Pontuação", "Placar e fragmentos", "O sistema calcula o placar. Esta página serve para explicar o critério e registrar contingências.")
    draw_card(c, 18 * MM, y - 45 * MM, 52 * MM, 38 * MM, "Cada selo", "Sete validações somam 700 pontos.", "PONTUAÇÃO", RUST, "100")
    draw_card(c, 79 * MM, y - 45 * MM, 52 * MM, 38 * MM, "Câmara final", "A chave correta soma 200 pontos.", "PONTUAÇÃO", GOLD, "200")
    draw_card(c, 140 * MM, y - 45 * MM, 52 * MM, 38 * MM, "Pistas", "Cada equipe inicia com quatro fragmentos.", "RECURSO", TEAL, "4")
    y -= 62 * MM
    y = section_heading(c, "Critério de desempate", 18 * MM, y, 174 * MM)
    y = text_lines(c, "1. Maior pontuação.\n2. Maior número de selos validados.\n3. Menor horário de conclusão da câmara final.\n4. Clareza das evidências, julgada pelo professor.", 22 * MM, y, 165 * MM, 10, 16, INK)
    y -= 12 * MM
    y = section_heading(c, "Contingência sem sistema", 18 * MM, y, 174 * MM)
    text_lines(c, "Use a folha de placar da página 22. Cada selo recebe assinatura do professor e vale 100 pontos. Registre também cada fragmento consumido.", 22 * MM, y, 165 * MM, 9.5, 14, MUTED)
    c.showPage(); page += 1

    # 7. Student quick start
    y = page_base(c, page, "Folha do aluno", "Entrada na expedição", "Deixe uma cópia visível em cada mesa.")
    steps = [("1", "Entre com sua RA no endereço informado."), ("2", "Uma pessoa cria a equipe e compartilha o código."), ("3", "Os demais integrantes entram com o mesmo código."), ("4", "Distribuam as quatro responsabilidades."), ("5", "Leiam o selo, registrem uma previsão e resolvam."), ("6", "Preencham as quatro evidências antes de submeter."), ("7", "Se necessário, consumam um fragmento para abrir a pista."), ("8", "Anotem cada runa. Elas formarão a chave final.")]
    for idx, (num, body) in enumerate(steps):
        y = numbered_item(c, num, "", body, 18 * MM, y, 174 * MM)
    c.showPage(); page += 1

    # 8. Role cards
    y = page_base(c, page, "Recortar", "Cartões de responsabilidade", "Uma folha atende uma equipe. Corte nas linhas pontilhadas.")
    roles = [("CARTÓGRAFO", "Organiza os dados, desenha representações e mantém a folha legível."), ("DECIFRADOR", "Conduz os cálculos e propõe transformações."), ("CÉTICO", "Procura contraexemplos, casos ausentes e erros de hipótese."), ("GUARDIÃO", "Registra as evidências e controla a submissão no sistema.")]
    for idx, (name, body) in enumerate(roles):
        col = idx % 2; row = idx // 2
        x = 18 * MM + col * 89 * MM; yy = y - 72 * MM - row * 79 * MM
        draw_card(c, x, yy, 83 * MM, 66 * MM, name, body + "\n\nNome: __________________________", "RESPONSABILIDADE", [RUST, GOLD, TEAL, GREEN][idx], f"0{idx+1}")
    c.setDash(3, 3); c.setStrokeColor(MUTED); c.line(PAGE_W / 2, 24 * MM, PAGE_W / 2, y + 6 * MM); c.line(14 * MM, y - 78 * MM, PAGE_W - 14 * MM, y - 78 * MM); c.setDash()
    c.showPage(); page += 1

    # 9. Hint cards
    y = page_base(c, page, "Recortar", "Fragmentos de pista", "Entregue os quatro cartões no início. O sistema também contabiliza o consumo.")
    for idx in range(4):
        col = idx % 2; row = idx // 2
        x = 18 * MM + col * 89 * MM; yy = y - 62 * MM - row * 68 * MM
        draw_card(c, x, yy, 83 * MM, 56 * MM, "FRAGMENTO DE PISTA", "Entregue este cartão ao professor e abra a pista digital do selo atual.\n\nEquipe: _______________________", "RECURSO CONSUMÍVEL", GOLD, str(idx + 1))
    c.setDash(3, 3); c.setStrokeColor(MUTED); c.line(PAGE_W / 2, 40 * MM, PAGE_W / 2, y + 4 * MM); c.line(14 * MM, y - 68 * MM, PAGE_W - 14 * MM, y - 68 * MM); c.setDash()
    c.showPage(); page += 1

    # 10. Anomaly cards
    y = page_base(c, page, "Recortar", "Anomalias coletivas", "Use a primeira após o selo 3 e a segunda antes do selo 7.")
    draw_card(c, 18 * MM, y - 78 * MM, 174 * MM, 66 * MM, "A sala perdeu uma premissa", "Durante quatro minutos, escrevam uma premissa adicional que torne a conclusão inevitável. O Cético deve tentar quebrá-la com um contraexemplo.\n\nValidação: premissa clara + teste que falhe sem ela.", "ANOMALIA 1", RUST, "04:00")
    draw_card(c, 18 * MM, y - 157 * MM, 174 * MM, 66 * MM, "O circuito começou a contar caminhos", "Uma entrada assume 0, 1 ou falha. A outra permanece binária. Quantas combinações existem? Como representar a falha sem confundi-la com 0?\n\nValidação: princípio multiplicativo + convenção explícita.", "ANOMALIA 2", TEAL, "06")
    c.showPage(); page += 1

    # 11-17. Mission handouts
    for mission in missions:
        y = page_base(c, page, f"Selo {mission['number']} - {mission['studio']}", mission["title"], f"Tempo sugerido: {mission['minutes']} | Runa reservada ao professor")
        c.setFillColor(RUST); c.setFont("Axiom", 44); c.drawString(18 * MM, y - 9 * MM, mission["number"])
        text_lines(c, mission["story"], 42 * MM, y, 150 * MM, 10.5, 14, MUTED)
        y -= 28 * MM
        y = section_heading(c, "Inscrição na porta", 18 * MM, y, 174 * MM)
        y = text_lines(c, mission["objective"], 22 * MM, y, 165 * MM, 12, 16, INK) - 5 * MM
        y = section_heading(c, "Dados do selo", 18 * MM, y, 174 * MM)
        c.setFillColor(PANEL); c.setStrokeColor(LINE); c.roundRect(18 * MM, y - 47 * MM, 174 * MM, 45 * MM, 6, fill=1, stroke=1)
        text_lines(c, mission["data"], 23 * MM, y - 8 * MM, 164 * MM, 9, 12, INK)
        y -= 58 * MM
        y = section_heading(c, "Resposta da equipe", 18 * MM, y, 174 * MM)
        field_h = 24 * MM if len(mission["fields"]) == 2 else 18 * MM
        for field in mission["fields"]:
            lines_box(c, 18 * MM, y - field_h, 174 * MM, field_h - 3, field, 2)
            y -= field_h + 4
        text_lines(c, "Previsão antes da validação:", 18 * MM, y, 174 * MM, 8, 10, MUTED)
        c.setStrokeColor(LINE); c.line(18 * MM, y - 10 * MM, 192 * MM, y - 10 * MM)
        c.showPage(); page += 1

    # 18. Final chamber handout
    y = page_base(c, page, "Câmara final", "A chave de contenção", "Abra esta folha somente depois que a equipe reunir as sete runas.")
    text_lines(c, "Combine a palavra revelada, o número de configurações possíveis dos sete selos binários e quantas configurações satisfazem a conjunção de todos eles.", 18 * MM, y, 174 * MM, 12, 17, INK)
    y -= 35 * MM
    for idx in range(7):
        x = 20 * MM + idx * 24 * MM
        c.setStrokeColor(RUST); c.setFillColor(white); c.circle(x + 8 * MM, y, 9 * MM, fill=1, stroke=1)
        c.setFillColor(MUTED); c.setFont("Axiom", 7); c.drawCentredString(x + 8 * MM, y - 2, f"S{idx+1}")
    y -= 30 * MM
    lines_box(c, 18 * MM, y - 24 * MM, 52 * MM, 24 * MM, "Palavra revelada", 2)
    lines_box(c, 79 * MM, y - 24 * MM, 52 * MM, 24 * MM, "Configurações", 2)
    lines_box(c, 140 * MM, y - 24 * MM, 52 * MM, 24 * MM, "Todos verdadeiros", 2)
    y -= 42 * MM
    lines_box(c, 18 * MM, y - 33 * MM, 174 * MM, 33 * MM, "Chave final no formato PALAVRA-000-0", 3)
    y -= 47 * MM
    lines_box(c, 18 * MM, y - 45 * MM, 174 * MM, 45 * MM, "Justificativa matemática", 5)
    c.showPage(); page += 1

    # 19-20. Evidence sheets
    for copy in range(2):
        y = page_base(c, page, "Folha de trabalho", f"Registro de evidências {copy + 1}", "Uma folha comporta dois selos. Duplique conforme a necessidade da turma.")
        for block in range(2):
            top = y - block * 92 * MM
            c.setFillColor(INK); c.setFont("Axiom", 9); c.drawString(18 * MM, top, "SELO: ____________   EQUIPE: ______________________________   TENTATIVA: ____")
            lines_box(c, 18 * MM, top - 29 * MM, 84 * MM, 23 * MM, "1. Representação usada", 3)
            lines_box(c, 108 * MM, top - 29 * MM, 84 * MM, 23 * MM, "2. Resultado obtido", 3)
            lines_box(c, 18 * MM, top - 60 * MM, 84 * MM, 23 * MM, "3. Teste ou caso verificado", 3)
            lines_box(c, 108 * MM, top - 60 * MM, 84 * MM, 23 * MM, "4. Explicação matemática", 3)
            lines_box(c, 18 * MM, top - 84 * MM, 174 * MM, 17 * MM, "Previsão registrada antes da validação", 2)
        c.showPage(); page += 1

    # 21. Team sheet
    y = page_base(c, page, "Folha de equipe", "Registro da expedição", "Uma cópia por equipe.")
    lines_box(c, 18 * MM, y - 18 * MM, 112 * MM, 16 * MM, "Nome da equipe", 1)
    lines_box(c, 138 * MM, y - 18 * MM, 54 * MM, 16 * MM, "Código digital", 1)
    y -= 30 * MM
    y = section_heading(c, "Integrantes e responsabilidades", 18 * MM, y, 174 * MM)
    for idx, role in enumerate(["Cartógrafo", "Decifrador", "Cético", "Guardião"]):
        lines_box(c, 18 * MM, y - 17 * MM, 174 * MM, 14 * MM, f"{role} - nome e RA", 1); y -= 20 * MM
    y -= 3 * MM
    y = section_heading(c, "Runas e tentativas", 18 * MM, y, 174 * MM)
    for idx in range(7):
        yy = y - idx * 15 * MM
        c.setFillColor(RUST); c.setFont("Axiom", 10); c.drawString(18 * MM, yy, f"Selo {idx+1}")
        c.setStrokeColor(LINE); c.line(40 * MM, yy - 1, 85 * MM, yy - 1)
        c.setFillColor(MUTED); c.setFont("Axiom", 8); c.drawString(92 * MM, yy, "Runa: ______   Tentativas: ____   Fragmento usado: sim / não")
    c.showPage(); page += 1

    # 22. Scoreboard
    y = page_base(c, page, "Painel do professor", "Placar de contingência", "Use apenas se a projeção ou o sistema estiver indisponível.")
    headers = ["#", "Equipe", "Selos", "Pontos", "Pistas", "Conclusão"]
    widths = [10, 72, 22, 25, 22, 30]
    x0 = 15 * MM; yy = y
    c.setFillColor(INK); c.rect(x0, yy - 10 * MM, sum(widths) * MM, 10 * MM, fill=1, stroke=0)
    x = x0
    c.setFillColor(white); c.setFont("Axiom", 7.5)
    for header, width in zip(headers, widths):
        c.drawString(x + 2 * MM, yy - 6 * MM, header); x += width * MM
    for row in range(12):
        yy -= 12 * MM; x = x0
        c.setFillColor(white if row % 2 == 0 else PANEL); c.rect(x0, yy - 10 * MM, sum(widths) * MM, 10 * MM, fill=1, stroke=0)
        c.setStrokeColor(LINE); c.line(x0, yy - 10 * MM, x0 + sum(widths) * MM, yy - 10 * MM)
        c.setFillColor(MUTED); c.setFont("Axiom", 8); c.drawString(x + 3 * MM, yy - 6 * MM, str(row + 1)); x += widths[0] * MM
        for width in widths[1:]:
            c.line(x, yy - 10 * MM, x, yy); x += width * MM
    c.showPage(); page += 1

    # 23. Rubric
    y = page_base(c, page, "Validação", "Rubrica das quatro evidências", "Marque o nível predominante antes de confirmar um selo em uma aplicação manual.")
    criteria = [
        ("Representação", "Ausente ou incompatível", "Parcial, com elementos faltando", "Adequada e legível"),
        ("Resultado", "Sem resposta objetiva", "Resposta com erro de notação", "Correto e completo"),
        ("Teste", "Sem verificação", "Verifica apenas um caso favorável", "Inclui caso crítico ou contraexemplo"),
        ("Explicação", "Afirma sem justificar", "Cita regra sem conectar etapas", "Relaciona regra, teste e resultado"),
    ]
    col_x = [18, 61, 106, 151]
    headers = ["Critério", "Insuficiente", "Em desenvolvimento", "Validado"]
    for x, header in zip(col_x, headers):
        c.setFillColor(INK); c.setFont("Axiom", 8); c.drawString(x * MM, y, header)
    y -= 9 * MM
    for crit in criteria:
        h = 34 * MM
        c.setFillColor(white); c.setStrokeColor(LINE); c.rect(18 * MM, y - h, 174 * MM, h, fill=1, stroke=1)
        for x in col_x[1:]: c.line(x * MM, y - h, x * MM, y)
        text_lines(c, crit[0], 20 * MM, y - 8 * MM, 37 * MM, 8.5, 11, INK)
        text_lines(c, crit[1], 63 * MM, y - 8 * MM, 39 * MM, 7.5, 10, MUTED)
        text_lines(c, crit[2], 108 * MM, y - 8 * MM, 39 * MM, 7.5, 10, MUTED)
        text_lines(c, crit[3], 153 * MM, y - 8 * MM, 35 * MM, 7.5, 10, GREEN)
        y -= h
    c.showPage(); page += 1

    # 24-30. Mission answer pages
    for mission in missions:
        y = page_base(c, page, f"Gabarito reservado - Selo {mission['number']}", mission["title"], f"Runa liberada: {mission['rune']} | Não distribua esta página aos alunos.")
        c.setFillColor(RUST); c.setFont("Axiom", 52); c.drawString(18 * MM, y - 10 * MM, mission["rune"])
        text_lines(c, mission["answer"], 48 * MM, y - 2 * MM, 140 * MM, 13, 18, INK)
        y -= 42 * MM
        y = section_heading(c, "Critério de validação", 18 * MM, y, 174 * MM)
        y = text_lines(c, mission["criterion"], 22 * MM, y, 165 * MM, 10.5, 15, MUTED) - 10 * MM
        y = section_heading(c, "Perguntas de mediação", 18 * MM, y, 174 * MM)
        prompts = ["Qual representação tornou a estrutura do problema visível?", "Que caso poderia invalidar a resposta?", "Onde aparece a regra matemática usada pela equipe?", "Como a resposta mudaria se uma condição fosse alterada?"]
        for idx, prompt in enumerate(prompts):
            y = numbered_item(c, str(idx + 1), "", prompt, 22 * MM, y, 165 * MM)
        y -= 5 * MM
        y = section_heading(c, "Sinais de compreensão", 18 * MM, y, 174 * MM)
        text_lines(c, "A equipe explica sem depender da resposta pronta; conecta o resultado ao teste; identifica limites da estratégia; responde a uma variação simples.", 22 * MM, y, 165 * MM, 9.5, 14, GREEN)
        c.showPage(); page += 1

    # 31. Final answer + debrief
    y = page_base(c, page, "Gabarito reservado", "Câmara final e debrief", "Última página do kit.")
    draw_card(c, 18 * MM, y - 47 * MM, 174 * MM, 40 * MM, "PARADOX-128-1", "As runas formam PARADOX. Sete selos binários produzem 2^7 = 128 configurações. Apenas uma configuração deixa todos os selos verdadeiros simultaneamente.", "CHAVE DE CONTENÇÃO", GREEN, "1")
    y -= 64 * MM
    y = section_heading(c, "Debrief em 10 minutos", 18 * MM, y, 174 * MM)
    questions = ["Qual evidência eliminou a maior dúvida?", "Qual erro mudou o caminho da equipe?", "Onde dois conteúdos apareceram no mesmo raciocínio?", "Em qual selo a representação foi mais importante do que o cálculo?", "Que estratégia a equipe levaria para outro problema?"]
    for idx, question in enumerate(questions):
        y = numbered_item(c, str(idx + 1), "", question, 22 * MM, y, 165 * MM)
    y -= 4 * MM
    y = section_heading(c, "Reconhecimentos opcionais", 18 * MM, y, 174 * MM)
    text_lines(c, "Maior pontuação | Melhor contraexemplo | Melhor evidência | Cooperação", 22 * MM, y, 165 * MM, 10, 14, GOLD)
    c.showPage()

    c.save()
    print(OUT)


if __name__ == "__main__":
    build_pdf()
