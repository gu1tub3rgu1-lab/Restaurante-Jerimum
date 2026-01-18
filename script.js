/* ==========================================================================
   1. CONFIGURAÇÕES E DADOS INICIAIS
   ========================================================================== */
const configPadrao = {
    precos: { Pequena: 18.00, Grande: 25.00, Extra: 5.00 },
    horarios: { abre: 10, fecha: 14 },
    itens: {
        acompanhamentos: [
            { nome: "Arroz", adicional: 0 }, 
            { nome: "Feijão", adicional: 0 },
            { nome: "Macarrão", adicional: 0 },
            { nome: "Angu", adicional: 0 },
            { nome: "Batata Frita", adicional: 0 }
        ],
        carnes: [
            { nome: "Frango Grelhado", adicional: 0 }, 
            { nome: "Carne de Panela", adicional: 0 },
            { nome: "Costelinha", adicional: 0 }
        ],
        saladas: [
            { nome: "Alface e Tomate", adicional: 0 },
            { nome: "Maionese", adicional: 0 },
            { nome: "Vinagrete", adicional: 0 }
        ]
    }
};


const CRED_ADMIN = {
    u: "Z3Vpbm1jc2FudG9zMkBnbWFpbC5jb20=", 
    p: "MTIzNA=="                           
};

function carregarConfig() {
    try {
        const salvos = localStorage.getItem('jerimumConfig');
        if (!salvos) return configPadrao;
        const config = JSON.parse(salvos);
        if (!config.precos || isNaN(config.precos.Pequena)) return configPadrao;
        return config;
    } catch (e) {
        return configPadrao;
    }
}

let cardapioConfig = carregarConfig();

let pedido = {
    tamanho: "",
    basePreco: 0,
    acompanhamentos: [],
    carnes: [],
    saladas: [],
    total: 0
};

/* ==========================================================================
   2. RENDERIZAÇÃO E INTERFACE
   ========================================================================== */
function renderizarCardapio() {
    const mainContainer = document.getElementById('menu-principal');
    if (!mainContainer) return;

    const agora = new Date();
    const horaAtual = agora.getHours();
    const estaAberto = horaAtual >= cardapioConfig.horarios.abre && horaAtual < cardapioConfig.horarios.fecha;

    mainContainer.innerHTML = `
        <div class="status-loja ${estaAberto ? 'aberto' : 'fechado'}" style="margin-bottom: 20px;">
            ${estaAberto ? '🟢 Aberto para Pedidos' : '🔴 Fechado no Momento'}
        </div>

        <section class="step-section">
            <h2 class="step-title">1. Escolha o Tamanho <span class="obrigatorio">*</span></h2>
            <div class="options-grid" id="tamanhos">
                <div class="card-option" onclick="selectTamanho(this, 'Pequena', ${cardapioConfig.precos.Pequena})">
                    <h3>Pequena</h3>
                    <span class="price">R$ ${Number(cardapioConfig.precos.Pequena).toFixed(2)}</span>
                </div>
                <div class="card-option" onclick="selectTamanho(this, 'Grande', ${cardapioConfig.precos.Grande})">
                    <h3>Grande</h3>
                    <span class="price">R$ ${Number(cardapioConfig.precos.Grande).toFixed(2)}</span>
                </div>
            </div>
        </section>

        ${gerarSecao('2. Acompanhamentos', 'acompanhamentos', true)}
        ${gerarSecao(`3. Carnes (Extra +R$ ${Number(cardapioConfig.precos.Extra).toFixed(2)})`, 'carnes', true)}
        ${gerarSecao('4. Saladas', 'saladas', true)}

        <section class="step-section">
            <h2 class="step-title">5. Horário de Retirada <span class="obrigatorio">*</span></h2>
            <div class="aviso-entrega">📍 Somente retirada no local. Informe o horário:</div>
            <select id="horario-retirada" class="select-moderno" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 1rem;">
                <option value="">Escolha um horário...</option>
                ${gerarHorarios()}
            </select>
        </section>

        <section class="step-section">
            <h2 class="step-title">6. Observações</h2>
            <textarea id="observacoes" class="input-moderno" placeholder="Ex: Sem cebola, capricha no feijão..." rows="3" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;"></textarea>
        </section>
    `;
}

function gerarSecao(titulo, tipo, obrigatorio) {
    let html = `<section class="step-section">
        <h2 class="step-title">${titulo} ${obrigatorio ? '<span class="obrigatorio">*</span>' : ''}</h2>
        <div class="options-grid">`;
    
    cardapioConfig.itens[tipo].forEach(item => {
        const extra = item.adicional > 0 ? `<br><small>+ R$ ${Number(item.adicional).toFixed(2)}</small>` : "";
        html += `
            <div class="card-option multi" onclick="toggleMulti(this, '${item.nome}', '${tipo}', ${item.adicional})">
                ${item.nome} ${extra}
            </div>`;
    });
    
    html += `</div></section>`;
    return html;
}

function gerarHorarios() {
    let options = "";
    const abre = cardapioConfig.horarios.abre;
    const fecha = cardapioConfig.horarios.fecha;
    for (let h = abre; h < fecha; h++) {
        options += `<option value="${h}:00">${h}:00</option>`;
        options += `<option value="${h}:30">${h}:30</option>`;
    }
    return options;
}

/* ==========================================================================
   3. LÓGICA DO PEDIDO E CÁLCULOS
   ========================================================================== */
function selectTamanho(elemento, nome, preco) {
    const container = document.getElementById('tamanhos');
    if (container) {
        container.querySelectorAll('.card-option').forEach(c => c.classList.remove('selected'));
    }
    elemento.classList.add('selected');
    pedido.tamanho = nome;
    pedido.basePreco = Number(preco);
    atualizarCalculos();
}

function toggleMulti(elemento, nome, categoria, adicional) {
    elemento.classList.toggle('selected');
    const lista = pedido[categoria];
    const i = lista.findIndex(it => it.nome === nome);
    if (i > -1) { 
        lista.splice(i, 1); 
    } else { 
        lista.push({ nome, adicional: Number(adicional) }); 
    }
    atualizarCalculos();
}

function atualizarCalculos() {
    let subtotal = Number(pedido.basePreco) || 0;
    const todosItens = [...pedido.acompanhamentos, ...pedido.carnes, ...pedido.saladas];
    todosItens.forEach(it => subtotal += Number(it.adicional) || 0);

    if (pedido.carnes.length > 1) {
        subtotal += (pedido.carnes.length - 1) * Number(cardapioConfig.precos.Extra);
    }

    pedido.total = subtotal;
    
    const valorDisplay = document.getElementById('valor-total');
    const resumoDisplay = document.getElementById('resumo-texto');
    
    if (valorDisplay) valorDisplay.innerText = `R$ ${pedido.total.toFixed(2)}`;
    if (resumoDisplay) {
        resumoDisplay.innerText = pedido.tamanho ? 
            `Marmita ${pedido.tamanho} • ${pedido.carnes.length} carne(s)` : 
            "Selecione o tamanho...";
    }
}

function finalizarPedido() {
    const horario = document.getElementById('horario-retirada')?.value;
    const obs = document.getElementById('observacoes')?.value;
    
    if (!pedido.tamanho || pedido.carnes.length === 0 || pedido.acompanhamentos.length === 0 || !horario) {
        return alert("⚠️ Por favor, selecione os itens obrigatórios (*): Tamanho, Acompanhamentos, Carne e Horário!");
    }

    const msg = `*JERIMUM - RETIRADA*%0A` +
                `*Horário:* ${horario}%0A` +
                `*Item:* Marmita ${pedido.tamanho}%0A` +
                `*Carnes:* ${pedido.carnes.map(c => c.nome).join(', ')}%0A` +
                `*Acomps:* ${pedido.acompanhamentos.map(a => a.nome).join(', ')}%0A` +
                `*Salada:* ${pedido.saladas.map(s => s.nome).join(', ')}%0A` +
                (obs ? `*Obs:* ${obs}%0A` : "") +
                `*Total:* R$ ${pedido.total.toFixed(2)}%0A` +
                `_Não realizamos entregas._`;

    window.open(`https://wa.me/5599999999999?text=${msg}`);
}

/* ==========================================================================
   4. ACESSO ADMINISTRATIVO
   ========================================================================== */
function abrirLoginAdmin() {
    document.getElementById('modalLogin').style.display = 'flex';
}

function fecharLoginAdmin() {
    document.getElementById('modalLogin').style.display = 'none';
}

function verificarAcesso() {
    // btoa converte o texto digitado para Base64 para comparar com o disfarce
    const emailDigitado = btoa(document.getElementById('emailAdmin').value);
    const senhaDigitada = btoa(document.getElementById('senhaAdmin').value);

    if (emailDigitado === CRED_ADMIN.u && senhaDigitada === CRED_ADMIN.p) {
        sessionStorage.setItem('logado', 'true');
        window.location.href = 'admin.html';
    } else {
        alert("Acesso Negado! Usuário ou senha incorretos.");
    }
}

// Inicializa o cardapio ao carregar a página
document.addEventListener('DOMContentLoaded', renderizarCardapio);