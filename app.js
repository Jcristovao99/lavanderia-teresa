        // API endpoint
        const API_URL = "https://lavanderia-teresa.onrender.com/optimize";
        
        // Initial items data
        const initialItems = [
            { id: "peca_variada", name: "Peça Variada", price: 0.90 },
            { id: "camisa", name: "Camisa", price: 1.80 },
            { id: "toalha_ou_lencol", name: "Toalha ou Lençol", price: 1.50 },
            { id: "capa_de_edredon", name: "Capa de Edredom", price: 3.50 },
            { id: "vestido_simples", name: "Vestido Simples", price: 3.50 },
            { id: "calca_com_vinco", name: "Calça com Vinco", price: 3.50 },
            { id: "blazer", name: "Blazer", price: 4.50 },
            { id: "calca_com_blazer", name: "Calça com Blazer", price: 12.50 },
            { id: "vestido_cerimonia", name: "Vestido de Cerimônia", price: 12.50 },
            { id: "blusao_almofadado", name: "Blusão Almofadado", price: 13.00 },
            { id: "casaco_sobretudo", name: "Casaco Sobretudo", price: 16.90 },
            { id: "blusao_penas", name: "Blusão de Penas", price: 20.00 },
            { id: "vestido_noiva", name: "Vestido de Noiva", price: 100.00 }
        ];

        // Pack definitions for price lookup
        const packsMistos = [
            { tipo: "20", preco: 16.0 },
            { tipo: "40", preco: 28.0 },
            { tipo: "60", preco: 39.0 }
        ];

        const packsCamisas = [
            { tipo: "5", preco: 6.5 },
            { tipo: "10", preco: 12.0 }
        ];

        // Initial clients data
        const initialClients = [
            { id: "cl1", name: "Maria Silva", phone: "912 345 678", email: "maria@exemplo.com" },
            { id: "cl2", name: "João Pereira", phone: "913 456 789", email: "joao@exemplo.com" },
            { id: "cl3", name: "Ana Costa", phone: "914 567 890", email: "ana@exemplo.com" }
        ];

        // App state
        let quantities = {};
        let currentClient = "";
        let currentOrder = null;
        let items = [];
        let clients = [];
        let orders = [];

        // Initialize the app
        function initApp() {
            loadFromStorage();
            renderItems();
            updateClientDropdown();
            renderAdminItems();
            renderAdminClients();
            renderHistory();
            
            // Setup tab switching
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    switchTab(tab.dataset.tab);
                });
            });
            
            // Setup admin tabs (buttons only)
            document.querySelectorAll('.admin-tabs .admin-tab').forEach(button => {
                button.addEventListener('click', () => {
                    document.querySelectorAll('.admin-tabs .admin-tab').forEach(b => b.classList.remove('active'));
                    button.classList.add('active');

                    document.querySelectorAll('.admin-section').forEach(section => {
                        section.classList.remove('active');
                        if (section.classList.contains(button.dataset.tab)) {
                            section.classList.add('active');
                        }
                    });
                });
            });
            
            // Setup history filters
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderHistory(btn.dataset.filter);
                });
            });
            
            // Setup client selection
            document.getElementById('client-select').addEventListener('change', function() {
                currentClient = this.value;
                saveToStorage();
            });
        }

        // Load data from localStorage
        function loadFromStorage() {
            // Load items
            const savedItems = localStorage.getItem('laundryItems');
            items = savedItems ? JSON.parse(savedItems) : [...initialItems];
            
            // Load clients
            const savedClients = localStorage.getItem('laundryClients');
            clients = savedClients ? JSON.parse(savedClients) : [...initialClients];
            
            // Load quantities
            const savedQuantities = localStorage.getItem('currentQuantities');
            quantities = savedQuantities ? JSON.parse(savedQuantities) : {};
            
            // Initialize quantities if needed
            items.forEach(item => {
                if (quantities[item.id] === undefined) {
                    quantities[item.id] = 0;
                }
            });
            
            // Load orders
            const savedOrders = localStorage.getItem('orderHistory');
            orders = savedOrders ? JSON.parse(savedOrders) : [];
            // Ensure timestamps for filtering
            orders.forEach(o => {
                if (!o.timestamp) {
                    if (typeof o.id === 'number') {
                        o.timestamp = o.id;
                    } else if (o.date) {
                        const parts = o.date.split(',');
                        const [d, m, y] = parts[0].trim().split('/');
                        const time = parts[1] ? parts[1].trim() : '00:00:00';
                        const str = `${m}/${d}/${y} ${time}`;
                        const t = Date.parse(str);
                        o.timestamp = isNaN(t) ? Date.now() : t;
                    } else {
                        o.timestamp = Date.now();
                    }
                }
            });
            
            // Load selected client
            const savedClient = localStorage.getItem('currentClient');
            if (savedClient) {
                currentClient = savedClient;
            }
        }

        // Save data to localStorage
        function saveToStorage() {
            localStorage.setItem('laundryItems', JSON.stringify(items));
            localStorage.setItem('laundryClients', JSON.stringify(clients));
            localStorage.setItem('currentQuantities', JSON.stringify(quantities));
            localStorage.setItem('orderHistory', JSON.stringify(orders));
            localStorage.setItem('currentClient', currentClient);
        }

        // Render items in the order section
        function renderItems() {
            const container = document.getElementById('items-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'item-card';
                itemElement.innerHTML = `
                    <div class="item-header">
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">€${item.price.toFixed(2)}</div>
                    </div>
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="changeQuantity('${item.id}', -1)">-</button>
                        <input type="number" min="0" class="quantity-input" 
                               id="input-${item.id}" value="${quantities[item.id]}" 
                               onchange="setQuantity('${item.id}', this.value)">
                        <button class="quantity-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                    </div>
                `;
                container.appendChild(itemElement);
            });
        }

        // Update client dropdown
        function updateClientDropdown() {
            const select = document.getElementById('client-select');
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">Cliente Geral</option>';
            
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.name;
                option.textContent = client.name;
                select.appendChild(option);
            });
            
            select.value = currentValue || currentClient;
        }

        // Change item quantity
        function changeQuantity(itemId, delta) {
            quantities[itemId] = Math.max(0, quantities[itemId] + delta);
            const input = document.getElementById(`input-${itemId}`);
            if (input) input.value = quantities[itemId];
            saveToStorage();
        }
        
        // Set item quantity directly
        function setQuantity(itemId, value) {
            quantities[itemId] = Math.max(0, parseInt(value) || 0);
            saveToStorage();
        }
        
        // Reset all quantities
        function resetQuantities() {
            items.forEach(item => {
                quantities[item.id] = 0;
            });
            renderItems();
            saveToStorage();
            const resultElement = document.getElementById('result');
            if (resultElement) {
                resultElement.style.display = 'none';
                resultElement.classList.remove('visible');
            }
        }
        
        // Toggle dark mode
        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            const icon = document.querySelector('.theme-toggle i');
            if (icon) {
                if (document.body.classList.contains('dark-mode')) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }
        }
        
        // Calculate costs using the API
        async function calculate() {
            const spinner = document.getElementById('loading-spinner');
            const btn = document.querySelector('.calculate-btn');
            
            if (!spinner || !btn) return;
            
            // Show loading state
            spinner.style.display = 'block';
            btn.disabled = true;
            
            // Prepare request data
            const requestData = {
                items: {...quantities},
                cliente: currentClient || "Cliente Geral"
            };
            
            try {
                // Call the API
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensagem || `HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                
                // Create order object
                const timestamp = Date.now();
                currentOrder = {
                    id: timestamp,
                    timestamp,
                    date: new Date(timestamp).toLocaleString('pt-PT'),
                    client: currentClient || "Cliente Geral",
                    quantities: {...quantities},
                    total: result.custo_total,
                    status: 'pending',
                    details: result.detalhes,
                    pdf_url: result.pdf_url
                };
                
                // Display results
                displayResults(result);
                
            } catch (error) {
                console.error('API Error:', error);
                alert(`Erro: ${error.message || "Falha na comunicação com o servidor"}`);
            } finally {
                // Hide loading state
                spinner.style.display = 'none';
                btn.disabled = false;
            }
        }
        
        // Display calculation results
        function displayResults(result) {
            // 1. Get required DOM elements
            const totalCostElement = document.getElementById('total-cost');
            const breakdownContainer = document.getElementById('cost-breakdown');
            const resultHeader = document.querySelector('.result-header');
            const resultElement = document.getElementById('result');
            
            // 2. Check if all elements exist
            if (!totalCostElement || !breakdownContainer || !resultHeader || !resultElement) {
                console.error("Critical elements missing for results display");
                alert("Erro interno: Elementos da interface não encontrados");
                return;
            }
            
            // 3. Calculate regular cost for savings comparison
            let regularCost = 0;
            for (const [itemId, qty] of Object.entries(quantities)) {
                const item = items.find(i => i.id === itemId);
                if (item) {
                    regularCost += item.price * qty;
                }
            }
            
            const savings = regularCost - result.custo_total;
            const savingsPercent = regularCost > 0 ? (savings / regularCost * 100).toFixed(1) : 0;
            
            // 4. Update total cost
            totalCostElement.textContent = `Total: €${result.custo_total.toFixed(2)}`;
            
            // 5. Render cost breakdown
            breakdownContainer.innerHTML = '';
            
            const breakdownData = [
                { title: "Packs Mistos", value: result.detalhes.detalhe_custos.packs_mistos },
                { title: "Packs Camisas", value: result.detalhes.detalhe_custos.packs_camisas },
                { title: "Itens Avulsos", value: result.detalhes.detalhe_custos.itens_avulsos },
                { title: "Itens Fixos", value: result.detalhes.detalhe_custos.custos_fixos }
            ];
            
            breakdownData.forEach(item => {
                const card = document.createElement('div');
                card.className = 'breakdown-card';
                card.innerHTML = `
                    <div class="breakdown-title">${item.title}</div>
                    <div class="breakdown-value">€${item.value.toFixed(2)}</div>
                `;
                breakdownContainer.appendChild(card);
            });

            // Render detailed items
            const detailList = document.getElementById('order-detail-list');
            if (detailList) {
                detailList.innerHTML = '';

                // Packs mistos
                Object.entries(result.detalhes.packs_mistos).forEach(([tipo, qty]) => {
                    if (qty > 0) {
                        const pack = packsMistos.find(p => p.tipo === tipo);
                        const preco = pack ? pack.preco : 0;
                        const li = document.createElement('li');
                        li.textContent = `Pack Misto ${tipo} peças x${qty} €${(preco * qty).toFixed(2)}`;
                        detailList.appendChild(li);
                    }
                });

                // Packs camisas
                Object.entries(result.detalhes.packs_camisas).forEach(([tipo, qty]) => {
                    if (qty > 0) {
                        const pack = packsCamisas.find(p => p.tipo === tipo);
                        const preco = pack ? pack.preco : 0;
                        const li = document.createElement('li');
                        li.textContent = `Pack Camisas ${tipo} x${qty} €${(preco * qty).toFixed(2)}`;
                        detailList.appendChild(li);
                    }
                });

                // Itens avulsos
                Object.entries(result.detalhes.itens_avulsos).forEach(([itemId, qty]) => {
                    if (qty > 0) {
                        const item = items.find(i => i.id === itemId);
                        const preco = item ? item.price : 0;
                        const li = document.createElement('li');
                        li.textContent = `${item ? item.name : itemId} x${qty} €${(preco * qty).toFixed(2)}`;
                        detailList.appendChild(li);
                    }
                });

                // Itens fixos
                Object.entries(result.detalhes.itens_fixos).forEach(([itemId, qty]) => {
                    if (qty > 0) {
                        const item = items.find(i => i.id === itemId);
                        const preco = item ? item.price : 0;
                        const li = document.createElement('li');
                        li.textContent = `${item ? item.name : itemId} x${qty} €${(preco * qty).toFixed(2)}`;
                        detailList.appendChild(li);
                    }
                });
            }
            
            // 6. Update result header with savings
            resultHeader.innerHTML = `
                <h2 class="section-title"><i class="fas fa-chart-line"></i> Resultado da Otimização</h2>
                <div>
                    <a href="${result.pdf_url}" target="_blank" class="receipt-btn">
                        <i class="fas fa-file-pdf"></i> Ver Recibo
                    </a>
                    <div class="savings-badge">
                        <i class="fas fa-piggy-bank"></i> Poupança: €${savings.toFixed(2)} (${savingsPercent}%)
                    </div>
                </div>
            `;
            
            // 7. Show results with animation
            resultElement.style.display = 'block';
            setTimeout(() => {
                resultElement.classList.add('visible');
                resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        
        // Confirm the current order
        function confirmOrder() {
            if (!currentOrder) return;
            
            // Update status
            currentOrder.status = 'confirmed';
            
            // Add to orders
            orders.unshift(currentOrder);
            
            // Save and update UI
            saveToStorage();
            resetQuantities();
            const resultElement = document.getElementById('result');
            if (resultElement) {
                resultElement.style.display = 'none';
                resultElement.classList.remove('visible');
            }
            alert(`Pedido #${currentOrder.id} confirmado com sucesso! Total: €${currentOrder.total.toFixed(2)}`);
            switchTab('history');
        }
        
        // Cancel the current order
        function cancelOrder() {
            const resultElement = document.getElementById('result');
            if (resultElement) {
                resultElement.style.display = 'none';
                resultElement.classList.remove('visible');
            }
            currentOrder = null;
        }
        
        // Switch between tabs
        function switchTab(tabName) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                }
            });
            
            // Show/hide content
            const orderTab = document.querySelector('.order-tab');
            const historyTab = document.querySelector('.history-tab');
            const adminTab = document.querySelector('.admin-tab');
            
            if (orderTab) orderTab.classList.remove('active-tab');
            if (historyTab) historyTab.style.display = 'none';
            if (adminTab) adminTab.style.display = 'none';
            
            if (tabName === 'order' && orderTab) {
                orderTab.classList.add('active-tab');
            } else if (tabName === 'history' && historyTab) {
                historyTab.style.display = 'block';
                renderHistory();
            } else if (tabName === 'admin' && adminTab) {
                adminTab.style.display = 'block';
                renderAdminItems();
                renderAdminClients();
            }
        }
        
        // Open new client form
        function openNewClientForm() {
            switchTab('admin');
            document.querySelector('.admin-tabs .admin-tab[data-tab="clients"]').click();
            const form = document.querySelector('.admin-section.clients .admin-form');
            if (form) form.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Render items in admin panel
        function renderAdminItems() {
            const container = document.getElementById('admin-items-list');
            if (!container) return;
            
            container.innerHTML = '';
            
            items.forEach(item => {
                const itemRow = document.createElement('div');
                itemRow.className = 'item-row';
                itemRow.innerHTML = `
                    <div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">€${item.price.toFixed(2)}</div>
                    </div>
                    <div class="item-actions">
                        <button class="edit-btn" onclick="editItem('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(itemRow);
            });
        }
        
        // Render clients in admin panel
        function renderAdminClients() {
            const container = document.getElementById('admin-clients-list');
            if (!container) return;
            
            container.innerHTML = '';
            
            clients.forEach(client => {
                const clientRow = document.createElement('div');
                clientRow.className = 'client-row';
                clientRow.innerHTML = `
                    <div class="item-name">${client.name}</div>
                    <div class="client-actions">
                        <button class="edit-btn" onclick="editClient('${client.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteClient('${client.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(clientRow);
            });
        }
        
        // Render order history
        function renderHistory(filter = 'all') {
            const container = document.getElementById('history-list');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (orders.length === 0) {
                container.innerHTML = '<div class="sem-historico">Nenhum pedido registrado</div>';
                return;
            }
            
            // Apply filter
            let filteredOrders = orders;
            if (filter === 'confirmed') {
                filteredOrders = orders.filter(order => order.status === 'confirmed');
            } else if (filter === 'pending') {
                filteredOrders = orders.filter(order => order.status === 'pending');
            } else if (filter === 'today') {
                const today = new Date();
                filteredOrders = orders.filter(order => {
                    const ts = order.timestamp || order.id;
                    const d = new Date(ts);
                    return d.toDateString() === today.toDateString();
                });
            } else if (filter === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                filteredOrders = orders.filter(order => {
                    const ts = order.timestamp || order.id;
                    return new Date(ts) >= oneWeekAgo;
                });
            }
            
            // Render orders
            filteredOrders.forEach(order => {
                const orderElement = document.createElement('div');
                orderElement.className = 'historico-item';
                orderElement.onclick = () => showOrderDetails(order.id);
                orderElement.innerHTML = `
                    <div class="historico-data">
                        <span>${order.date}</span>
                        <span class="historico-total">€${order.total.toFixed(2)}</span>
                    </div>
                    <div class="historico-detalhes">
                        <span>${order.client}</span>
                        <span class="status-badge ${order.status === 'pending' ? 'pending' : ''}">
                            ${order.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </span>
                    </div>
                    <div class="historico-detalhes">
                        <span>${Object.values(order.quantities).reduce((a, b) => a + b, 0)} itens</span>
                        <span class="badge" onclick="showOrderDetails('${order.id}')">Ver detalhes</span>
                        <button class="delete-order-btn" onclick="deleteOrder('${order.id}', event)">Excluir</button>
                    </div>
                `;
                container.appendChild(orderElement);
            });
        }

        // Helper to render item list with prices
        function renderOrderItems(order) {
            const parts = [];

            Object.entries(order.details.packs_mistos || {}).forEach(([tipo, qty]) => {
                if (qty > 0) {
                    const pack = packsMistos.find(p => p.tipo === tipo);
                    const preco = pack ? pack.preco : 0;
                    parts.push(`Pack Misto ${tipo} peças x${qty} €${(preco * qty).toFixed(2)}`);
                }
            });

            Object.entries(order.details.packs_camisas || {}).forEach(([tipo, qty]) => {
                if (qty > 0) {
                    const pack = packsCamisas.find(p => p.tipo === tipo);
                    const preco = pack ? pack.preco : 0;
                    parts.push(`Pack Camisas ${tipo} x${qty} €${(preco * qty).toFixed(2)}`);
                }
            });

            Object.entries(order.details.itens_avulsos || {}).forEach(([itemId, qty]) => {
                if (qty > 0) {
                    const item = items.find(i => i.id === itemId);
                    const preco = item ? item.price : 0;
                    parts.push(`${item ? item.name : itemId} x${qty} €${(preco * qty).toFixed(2)}`);
                }
            });

            Object.entries(order.details.itens_fixos || {}).forEach(([itemId, qty]) => {
                if (qty > 0) {
                    const item = items.find(i => i.id === itemId);
                    const preco = item ? item.price : 0;
                    parts.push(`${item ? item.name : itemId} x${qty} €${(preco * qty).toFixed(2)}`);
                }
            });

            return parts.map(p => `<li>${p}</li>`).join('');
        }
        
        // Show order details modal
        function showOrderDetails(orderId) {
            orderId = Number(orderId);
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            // Create modal content
            const modalContent = `
                <div class="order-details-modal">
                    <div class="modal-header">
                        <h3>Detalhes do Pedido #${order.id}</h3>
                        <button class="close-modal" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Data:</strong> ${order.date}</p>
                        <p><strong>Cliente:</strong> ${order.client}</p>
                        <p><strong>Status:</strong> ${order.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</p>
                        
                        <h4>Itens:</h4>
                        <ul class="order-items-list">
                            ${renderOrderItems(order)}
                        </ul>
                        
                        <div class="cost-summary">
                            <p><strong>Total:</strong> €${order.total.toFixed(2)}</p>
                            ${order.pdf_url ? `<a href="${order.pdf_url}" target="_blank" class="download-pdf-btn">
                                <i class="fas fa-file-pdf"></i> Baixar Recibo
                            </a>` : ''}
                            <button class="action-btn calculate-btn" onclick="recreateOrder('${order.id}')">
                                <i class="fas fa-redo"></i> Recriar Pedido
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="action-btn reset-btn" onclick="closeModal()">Fechar</button>
                    </div>
                </div>
            `;

            // Create and show modal
            const modal = document.createElement('div');
            modal.id = 'order-details-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = modalContent;
            document.body.appendChild(modal);
        }

        // Close modal
        function closeModal() {
            const modal = document.getElementById('order-details-modal');
            if (modal) modal.remove();
        }

        // Delete order from history
        function deleteOrder(orderId, event) {
            event.stopPropagation(); // Prevent event bubbling

            if (!confirm('Tem certeza que deseja excluir este pedido do histórico?')) return;

            const id = Number(orderId);
            orders = orders.filter(order => order.id !== id);
            saveToStorage();
            renderHistory();
        }

        // Recreate order from history
        function recreateOrder(orderId) {
            const id = Number(orderId);
            const order = orders.find(o => o.id === id);
            if (!order) return;
            
            // Fill quantities
            for (const [itemId, qty] of Object.entries(order.quantities)) {
                if (quantities[itemId] !== undefined) {
                    quantities[itemId] = qty;
                }
            }
            
            // Select client
            if (order.client && order.client !== "Cliente Geral") {
                const select = document.getElementById('client-select');
                select.value = order.client;
                currentClient = order.client;
            }
            
            // Update UI
            renderItems();
            saveToStorage();
            closeModal();
            switchTab('order');
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
        
        // Add new item
        function addNewItem() {
            const name = document.getElementById('item-name').value;
            const price = parseFloat(document.getElementById('item-price').value);
            
            if (!name || isNaN(price)) {
                alert('Por favor, preencha todos os campos corretamente');
                return;
            }
            
            const newItem = {
                id: 'item_' + Date.now(),
                name: name,
                price: price
            };
            
            items.push(newItem);
            quantities[newItem.id] = 0;
            saveToStorage();
            
            // Update UI
            document.getElementById('item-name').value = '';
            document.getElementById('item-price').value = '';
            renderAdminItems();
            renderItems();
            alert('Item adicionado com sucesso!');
        }
        
        // Add new client
        function addNewClient() {
            const name = document.getElementById('client-name').value;
            const phone = document.getElementById('client-phone').value;
            const email = document.getElementById('client-email').value;
            
            if (!name) {
                alert('Por favor, preencha pelo menos o nome do cliente');
                return;
            }
            
            const newClient = {
                id: 'cl_' + Date.now(),
                name: name,
                phone: phone,
                email: email
            };
            
            clients.push(newClient);
            saveToStorage();
            
            // Update UI
            document.getElementById('client-name').value = '';
            document.getElementById('client-phone').value = '';
            document.getElementById('client-email').value = '';
            renderAdminClients();
            updateClientDropdown();
            alert('Cliente adicionado com sucesso!');
        }
        
        // Edit item
        function editItem(itemId) {
            const item = items.find(i => i.id === itemId);
            if (!item) return;
            
            const newName = prompt("Novo nome do item:", item.name);
            if (newName === null) return;
            
            const newPrice = parseFloat(prompt("Novo preço do item:", item.price));
            if (isNaN(newPrice)) return;
            
            item.name = newName;
            item.price = newPrice;
            saveToStorage();
            
            renderAdminItems();
            renderItems();
            alert('Item atualizado com sucesso!');
        }
        
        // Delete item
        function deleteItem(itemId) {
            if (!confirm('Tem certeza que deseja excluir este item?')) return;
            
            items = items.filter(item => item.id !== itemId);
            delete quantities[itemId];
            saveToStorage();
            
            renderAdminItems();
            renderItems();
            alert('Item excluído com sucesso!');
        }
        
        // Edit client
        function editClient(clientId) {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;
            
            const newName = prompt("Novo nome do cliente:", client.name);
            if (newName === null) return;
            
            const newPhone = prompt("Novo telefone do cliente:", client.phone);
            const newEmail = prompt("Novo email do cliente:", client.email);
            
            client.name = newName;
            client.phone = newPhone;
            client.email = newEmail;
            saveToStorage();
            
            renderAdminClients();
            updateClientDropdown();
            alert('Cliente atualizado com sucesso!');
        }
        
        // Delete client
        function deleteClient(clientId) {
            if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

            clients = clients.filter(client => client.id !== clientId);
            saveToStorage();

            renderAdminClients();
            updateClientDropdown();
            alert('Cliente excluído com sucesso!');
        }

        // Exportar histórico de pedidos para um ficheiro JSON
        function exportOrders() {
            if (orders.length === 0) {
                alert('Nenhum pedido para exportar');
                return;
            }
            const data = JSON.stringify(orders, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'orders.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }

        // Importar pedidos de um ficheiro JSON
        function importOrders(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data)) {
                        data.forEach(o => {
                            if (!orders.find(ex => ex.id === o.id)) {
                                orders.push(o);
                            }
                        });
                        orders.sort((a, b) => (b.timestamp || b.id) - (a.timestamp || a.id));
                        saveToStorage();
                        renderHistory();
                        alert('Pedidos importados com sucesso!');
                    } else {
                        alert('Arquivo de importação inválido');
                    }
                } catch (err) {
                    console.error('Erro ao importar', err);
                    alert('Falha ao importar pedidos');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        // Initialize the app when page loads
        window.addEventListener('DOMContentLoaded', initApp);

