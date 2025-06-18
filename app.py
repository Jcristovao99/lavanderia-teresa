from flask import Flask, request, jsonify, send_file
from laundry_optimizer_final import gpt_optimize_handler, CATALOG
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.units import mm
from datetime import datetime
import tempfile
import logging
import os
import uuid
from flask_cors import CORS
import threading
import time
from pathlib import Path
import traceback

app = Flask(__name__)

# Enhanced CORS Configuration
CORS(app, resources={
    r"/optimize": {
        "origins": ["https://jcristovao99.github.io"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    },
    r"/download_pdf/*": {
        "origins": ["https://jcristovao99.github.io"],
        "methods": ["GET"]
    },
    r"/health": {
        "origins": "*",
        "methods": ["GET"]
    }
})

# Configurações de caminho
BASE_DIR = Path(__file__).parent.resolve()
LOGO_PATH = BASE_DIR / "logo.png"

# Verificar existência do logo
if not LOGO_PATH.exists():
    app.logger.warning(f"Arquivo de logo não encontrado: {LOGO_PATH}")
    LOGO_PATH = None

# Configuração de logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# Lista de chaves válidas
VALID_KEYS = {
    "peca_variada", "camisa", "vestido_simples",
    "calca_com_vinco", "blazer", "toalha_ou_lencol",
    "capa_de_edredon", "calca_com_blazer", "vestido_cerimonia", 
    "vestido_noiva", "casaco_sobretudo", "blusao_almofadado", "blusao_penas"
}

# Cache para armazenar resultados
result_cache = {}
cache_lock = threading.Lock()

# ========================================================================== #
#  LIMPEZA AUTOMÁTICA DO CACHE (executa a cada 5 minutos)
# ========================================================================== #
def clean_cache():
    while True:
        time.sleep(300)  # 5 minutos
        now = time.time()
        with cache_lock:
            global result_cache
            # Mantém registros dos últimos 30 minutos
            result_cache = {k: v for k, v in result_cache.items() if now - v['timestamp'] < 1800}

# Inicia thread de limpeza
cache_cleaner = threading.Thread(target=clean_cache, daemon=True)
cache_cleaner.start()

# ========================================================================== #
#  GERADOR DE PDF PROFISSIONAL (ATUALIZADO)
# ========================================================================== #
def generate_receipt_pdf(resultado, cliente_nome=""):
    """Gera PDF profissional com design atualizado e altura dinâmica"""
    try:
        # 1. Criar arquivo temporário
        filename = os.path.join(tempfile.gettempdir(), f"receipt_{uuid.uuid4().hex}.pdf")
        
        # Criar canvas com tamanho A4
        c = canvas.Canvas(filename, pagesize=A4)
        width, height = A4
        
        # 2. Definir paleta de cores
        COLORS = {
            "background": colors.Color(249/255, 249/255, 247/255),  # #f9f9f7
            "text_dark": colors.Color(24/255, 34/255, 50/255),     # #182232
            "table_header": colors.Color(26/255, 45/255, 68/255),   # #1a2d44
            "row_even": colors.white,
            "row_odd": colors.Color(240/255, 240/255, 240/255),    # #f0f0f0
            "total_bg": colors.Color(26/255, 45/255, 68/255),      # #1a2d44
            "text_light": colors.white
        }
        
        # 3. Estilos personalizados
        styles = getSampleStyleSheet()
        item_style = ParagraphStyle(
            'Item',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=10,
            leading=12,
            textColor=COLORS["text_dark"]
        )
        
        total_style = ParagraphStyle(
            'Total',
            parent=styles['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=COLORS["text_light"]
        )
        
        # 4. Fundo
        c.setFillColor(COLORS["background"])
        c.rect(0, 0, width, height, fill=1, stroke=0)
        
        # 5. Logo no topo (largura total)
        logo_height = 50
        logo_y = height - logo_height - 20
        if LOGO_PATH and LOGO_PATH.exists():
            c.drawImage(
                str(LOGO_PATH),
                x=20,
                y=logo_y,
                width=width - 40,
                height=logo_height,
                preserveAspectRatio=True,
                mask='auto'
            )
        else:
            # Fallback caso o logo não exista
            c.setFillColor(COLORS["table_header"])
            c.rect(20, logo_y, width - 40, logo_height, fill=1, stroke=0)
            c.setFillColor(COLORS["text_light"])
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(width/2, logo_y + logo_height/2, "ENGOMADORIA TERESA")
        
        # 6. Nome do cliente (se fornecido)
        y_pos = logo_y - 30
        if cliente_nome:
            c.setFillColor(COLORS["text_dark"])
            c.setFont("Helvetica-Bold", 12)
            c.drawString(30, y_pos, f"Cliente: {cliente_nome}")
            y_pos -= 20
        
        # 7. Tabela de itens
        data = [['Descrição', 'Quantidade', 'Preço Unitário', 'Subtotal']]
        
        # Adicionar itens fixos
        for item, qty in resultado['detalhes']['itens_fixos'].items():
            if qty > 0:
                preco = CATALOG['avulso'][item]
                desc = item.replace('_', ' ').replace('ou', '/').title()
                data.append([
                    Paragraph(desc, item_style),
                    str(qty),
                    f"€{preco:.2f}".replace('.', ','),
                    f"€{(qty*preco):.2f}".replace('.', ',')
                ])
        
        # Adicionar packs mistos
        for pack, qty in resultado['detalhes']['packs_mistos'].items():
            if qty > 0:
                pack_data = next(p for p in CATALOG['packs_mistos'] if p['tipo'] == pack)
                data.append([
                    Paragraph(f"Pack Misto {pack} peças", item_style),
                    str(qty),
                    f"€{pack_data['preco']:.2f}".replace('.', ','),
                    f"€{(qty*pack_data['preco']):.2f}".replace('.', ',')
                ])
        
        # Adicionar packs de camisas
        for pack, qty in resultado['detalhes']['packs_camisas'].items():
            if qty > 0:
                pack_data = next(p for p in CATALOG['packs_camisas'] if p['tipo'] == pack)
                data.append([
                    Paragraph(f"Pack Camisas {pack}", item_style),
                    str(qty),
                    f"€{pack_data['preco']:.2f}".replace('.', ','),
                    f"€{(qty*pack_data['preco']):.2f}".replace('.', ',')
                ])
        
        # Adicionar itens avulsos
        for item, qty in resultado['detalhes']['itens_avulsos'].items():
            if qty > 0:
                preco = CATALOG['avulso'][item]
                desc = item.replace('_', ' ').title()
                data.append([
                    Paragraph(desc, item_style),
                    str(qty),
                    f"€{preco:.2f}".replace('.', ','),
                    f"€{(qty*preco):.2f}".replace('.', ',')
                ])
        
        # 8. Criar tabela com estilo
        table = Table(
            data, 
            colWidths=[width*0.4, width*0.15, width*0.2, width*0.25],
            repeatRows=1
        )
        
        table_style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), COLORS["table_header"]),
            ('TEXTCOLOR', (0,0), (-1,0), COLORS["text_light"]),
            ('FONT', (0,0), (-1,0), 'Helvetica-Bold', 10),
            ('ALIGN', (1,0), (-1,0), 'CENTER'),
            ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [COLORS["row_even"], COLORS["row_odd"]])
        ])
        
        table.setStyle(table_style)
        
        # 9. Desenhar tabela
        table.wrapOn(c, width - 40, height)
        table.drawOn(c, 20, y_pos - table._height - 30)
        
        # 10. Seção de total
        total_y = y_pos - table._height - 60
        c.setFillColor(COLORS["total_bg"])
        c.rect(20, total_y, width - 40, 30, fill=1, stroke=0)
        
        c.setFillColor(COLORS["text_light"])
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, total_y + 10, "TOTAL")
        
        total_text = f"€{resultado['custo_total']:.2f}".replace('.', ',')
        c.drawRightString(width - 30, total_y + 10, total_text)
        
        # 11. Adicionar rodapé com data e nome do cliente
        c.setFillColor(COLORS["text_dark"])
        c.setFont("Helvetica", 8)
        
        footer_text = f"Recibo gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        if cliente_nome:
            footer_text += f" | Cliente: {cliente_nome}"
        footer_text += " | Engomadoria Teresa"
        
        c.drawCentredString(width/2, 20, footer_text)
        
        c.save()
        return filename
            
    except Exception as e:
        app.logger.error(f"Erro ao gerar PDF: {str(e)}")
        app.logger.error(traceback.format_exc())
        raise

# ========================================================================== #
#  ENDPOINTS DA API
# ========================================================================== #
@app.route('/')
def home():
    """Endpoint raiz para evitar erros 404"""
    return jsonify({
        "status": "online",
        "servico": "API de Otimização para Engomadoria Teresa",
        "versao": "2.0.1",
        "endpoints": {
            "optimize": "/optimize (POST)",
            "download_pdf": "/download_pdf/<receipt_id> (GET)",
            "health": "/health (GET)"
        },
        "mensagem": "Envie um POST para /optimize com os itens de lavanderia"
    })

@app.route('/optimize', methods=['POST', 'OPTIONS'])
def optimize():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    # 1. Obter e validar dados de entrada
    try:
        app.logger.info("Recebendo solicitação de otimização")
        app.logger.info(f"Headers: {request.headers}")
        app.logger.info(f"Data: {request.data}")
        
        # Tentar obter JSON do corpo da requisição
        data = request.get_json(silent=True) or {}
        
        # Aceitar tanto o formato direto (novo) quanto o formato com "items" (antigo)
        if 'items' in data:
            items = data['items']
        else:
            items = data

        # Validação básica
        if not items or not isinstance(items, dict):
            raise ValueError("Formato inválido: esperado objeto com itens")
            
        # Capturar nome do cliente se fornecido
        cliente_nome = data.get('cliente', '').strip()
            
        # Converter valores para inteiros e validar
        clean_items = {}
        for item, qty in items.items():
            if item not in VALID_KEYS:
                raise ValueError(f"Item desconhecido: '{item}'. Itens válidos: {', '.join(VALID_KEYS)}")
                
            try:
                clean_qty = int(qty)
                if clean_qty < 0:
                    raise ValueError(f"Quantidade negativa para '{item}': {qty}")
                clean_items[item] = clean_qty
            except (TypeError, ValueError):
                raise ValueError(f"Quantidade inválida para '{item}': {qty} - deve ser número inteiro")

        app.logger.info(f"Pedido validado: {clean_items}")

    except Exception as e:
        app.logger.error(f"Erro na validação: {str(e)}")
        return jsonify({
            "status": "erro",
            "mensagem": str(e)
        }), 400

    # 2. Processar otimização usando o handler do ChatGPT
    try:
        app.logger.info("Iniciando otimização...")
        response = gpt_optimize_handler(clean_items)
        
        # Gerar ID único para o resultado
        receipt_id = str(uuid.uuid4())
        
        # Armazenar resultado no cache
        with cache_lock:
            result_cache[receipt_id] = {
                "result": response,
                "cliente": cliente_nome,  # Armazenar nome do cliente
                "timestamp": time.time()
            }
        
        # Adicionar URL para download do PDF (GET)
        base_url = "https://lavanderia-teresa.onrender.com"
        response['pdf_url'] = f"{base_url}/download_pdf/{receipt_id}"
        
        app.logger.info("Otimização concluída com sucesso")
        return _corsify_actual_response(jsonify(response))

    except Exception as e:
        app.logger.error(f"Erro fatal na otimização: {str(e)}")
        app.logger.error(traceback.format_exc())
        return _corsify_actual_response(jsonify({
            "status": "erro",
            "mensagem": f"Erro interno no servidor: {str(e)}"
        }), 500)

@app.route('/download_pdf/<receipt_id>', methods=['GET'])
def download_pdf(receipt_id):
    """Endpoint GET para download direto do PDF"""
    try:
        # Recuperar resultado do cache
        with cache_lock:
            if receipt_id not in result_cache:
                return jsonify({
                    "status": "erro",
                    "mensagem": "Recibo expirado ou inválido"
                }), 404
                
            resultado = result_cache[receipt_id]["result"]
            cliente_nome = result_cache[receipt_id]["cliente"]
        
        # Gerar PDF com nome do cliente
        filename = generate_receipt_pdf(resultado, cliente_nome)
        
        return send_file(
            filename,
            as_attachment=True,
            download_name=f"recibo_engomadoria_teresa_{receipt_id[:8]}.pdf",
            mimetype='application/pdf'
        )
            
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificação de saúde da API"""
    return jsonify({
        "status": "online",
        "versao": "2.0.1",
        "mensagem": "API com PDF dinâmico A4 e suporte a cliente"
    })

# ========================================================================== #
#  CORS HELPER FUNCTIONS
# ========================================================================== #
def _build_cors_preflight_response():
    response = jsonify({"status": "preflight"})
    response.headers.add("Access-Control-Allow-Origin", "https://jcristovao99.github.io")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response

def _corsify_actual_response(response, status=200):
    response.headers.add("Access-Control-Allow-Origin", "https://jcristovao99.github.io")
    return response, status

# ========================================================================== #
#  CONFIGURAÇÃO DE PRODUÇÃO
# ========================================================================== #
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    
    # Usar servidor de produção se configurado
    if os.environ.get('PRODUCTION'):
        try:
            # Tente usar Gunicorn se disponível
            from gunicorn.app.base import BaseApplication
            class FlaskApplication(BaseApplication):
                def __init__(self, app, options=None):
                    self.options = options or {}
                    self.application = app
                    super().__init__()
                def load_config(self):
                    for key, value in self.options.items():
                        self.cfg.set(key, value)
                def load(self):
                    return self.application
            
            options = {
                'bind': f'0.0.0.0:{port}',
                'workers': 4,
                'timeout': 120
            }
            app.logger.info(f"Iniciando servidor Gunicorn na porta {port}")
            FlaskApplication(app, options).run()
            
        except ImportError:
            # Fallback para Waitress se Gunicorn não estiver disponível
            from waitress import serve
            app.logger.info(f"Iniciando servidor Waitress na porta {port}")
            serve(app, host='0.0.0.0', port=port)
    else:
        # Modo de desenvolvimento
        app.logger.info(f"Iniciando servidor de desenvolvimento na porta {port}")
        app.run(host='0.0.0.0', port=port)
