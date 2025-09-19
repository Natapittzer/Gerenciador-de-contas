class AccountManager {
    constructor() {
        this.accounts = this.loadAccounts();
        this.currentEditId = null;
        this.currentScreen = 'main';
        this.monthlyChart = null;
        this.categoriesChart = null;
        this.currentTheme = this.loadTheme();
        this.init();
    }

    init() {
        this.bindEvents();
        this.applyTheme();
        this.renderAccounts();
    }

    bindEvents() {
        // Modal events
        document.getElementById('addAccountBtn').addEventListener('click', () => this.openModal());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('accountForm').addEventListener('submit', (e) => this.handleSubmit(e));

        // Confirm modal events
        document.getElementById('confirmCancel').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());

        // Navigation events
        document.getElementById('statsBtn').addEventListener('click', () => this.showStatsScreen());
        document.getElementById('backToMain').addEventListener('click', () => this.showMainScreen());

        // Theme toggle event
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Stats events
        document.getElementById('applyFilters').addEventListener('click', () => this.updateStats());

        // Search events
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterAccounts(e.target.value));
        document.getElementById('clearSearch').addEventListener('click', () => this.clearSearch());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const accountModal = document.getElementById('accountModal');
            const confirmModal = document.getElementById('confirmModal');
            
            if (e.target === accountModal) {
                this.closeModal();
            } else if (e.target === confirmModal) {
                this.hideConfirmModal();
            }
        });
    }

    openModal(accountId = null) {
        this.currentEditId = accountId;
        const modal = document.getElementById('accountModal');
        const form = document.getElementById('accountForm');
        
        if (accountId) {
            const account = this.accounts.find(acc => acc.id === accountId);
            if (account) {
                document.getElementById('accountName').value = account.name;
                document.getElementById('totalValue').value = account.totalValue;
                document.getElementById('dueDate').value = account.dueDate;
                document.getElementById('installments').value = account.installments.length;
                document.getElementById('tag').value = account.tag;
            }
        } else {
            form.reset();
        }
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('accountModal').style.display = 'none';
        this.currentEditId = null;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('accountName').value,
            totalValue: parseFloat(document.getElementById('totalValue').value),
            dueDate: document.getElementById('dueDate').value,
            installmentsCount: parseInt(document.getElementById('installments').value),
            tag: document.getElementById('tag').value
        };

        if (this.currentEditId) {
            this.updateAccount(this.currentEditId, formData);
        } else {
            this.addAccount(formData);
        }
        
        this.closeModal();
    }

    addAccount(formData) {
        const account = {
            id: Date.now().toString(),
            name: formData.name,
            totalValue: formData.totalValue,
            dueDate: formData.dueDate,
            tag: formData.tag,
            installments: this.calculateInstallments(formData),
            createdAt: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };

        this.accounts.push(account);
        this.saveAccounts();
        this.renderAccounts();
    }

    updateAccount(accountId, formData) {
        const accountIndex = this.accounts.findIndex(acc => acc.id === accountId);
        if (accountIndex !== -1) {
            this.accounts[accountIndex] = {
                ...this.accounts[accountIndex],
                name: formData.name,
                totalValue: formData.totalValue,
                dueDate: formData.dueDate,
                tag: formData.tag,
                installments: this.calculateInstallments(formData)
            };
            this.saveAccounts();
            this.renderAccounts();
        }
    }

    calculateInstallments(formData) {
        const installments = [];
        const installmentValue = formData.totalValue / formData.installmentsCount;
        const startDate = new Date(formData.dueDate);
        
        for (let i = 0; i < formData.installmentsCount; i++) {
            const installmentDate = new Date(startDate);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            
            installments.push({
                number: i + 1,
                value: parseFloat(installmentValue.toFixed(2)),
                dueDate: installmentDate.toISOString().split('T')[0],
                status: 'pending'
            });
        }
        
        return installments;
    }

    toggleInstallmentStatus(accountId, installmentNumber) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (account) {
            const installment = account.installments.find(inst => inst.number === installmentNumber);
            if (installment) {
                installment.status = installment.status === 'paid' ? 'pending' : 'paid';
                this.saveAccounts();
                this.renderAccounts();
            }
        }
    }

    deleteAccount(accountId) {
        this.showConfirmModal(accountId);
    }

    showConfirmModal(accountId) {
        const modal = document.getElementById('confirmModal');
        const account = this.accounts.find(acc => acc.id === accountId);
        
        if (account) {
            document.getElementById('confirmMessage').textContent = 
                `Tem certeza que deseja excluir a conta "${account.name}"?`;
        }
        
        modal.style.display = 'block';
        
        // Armazenar o ID da conta para exclusão
        this.accountToDelete = accountId;
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.accountToDelete = null;
    }

    confirmDelete() {
        if (this.accountToDelete) {
            this.accounts = this.accounts.filter(acc => acc.id !== this.accountToDelete);
            this.saveAccounts();
            this.renderAccounts();
            this.hideConfirmModal();
        }
    }

    filterAccounts(searchTerm) {
        const filteredAccounts = searchTerm 
            ? this.accounts.filter(account => 
                account.tag.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : this.accounts;
        
        this.renderAccounts(filteredAccounts);
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.renderAccounts();
    }

    getAccountStatus(account) {
        const today = new Date();
        const hasUnpaidInstallments = account.installments.some(inst => inst.status === 'pending');
        
        if (!hasUnpaidInstallments) {
            return 'paid';
        }
        
        const hasOverdueInstallments = account.installments.some(inst => 
            inst.status === 'pending' && new Date(inst.dueDate) < today
        );
        
        return hasOverdueInstallments ? 'overdue' : 'pending';
    }

    groupAccountsByTag(accounts) {
        const grouped = {};
        accounts.forEach(account => {
            if (!grouped[account.tag]) {
                grouped[account.tag] = [];
            }
            grouped[account.tag].push(account);
        });
        return grouped;
    }

    renderAccounts(accountsToRender = null) {
        const accounts = accountsToRender || this.accounts;
        
        // Classificar contas por status
        const paidAccounts = accounts.filter(acc => this.getAccountStatus(acc) === 'paid');
        const pendingAccounts = accounts.filter(acc => this.getAccountStatus(acc) === 'pending');
        const overdueAccounts = accounts.filter(acc => this.getAccountStatus(acc) === 'overdue');

        // Renderizar cada seção
        this.renderAccountSection('paidAccounts', paidAccounts);
        this.renderAccountSection('pendingAccounts', pendingAccounts);
        this.renderAccountSection('overdueAccounts', overdueAccounts);
    }

    renderAccountSection(containerId, accounts) {
        const container = document.getElementById(containerId);
        
        if (accounts.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma conta encontrada</div>';
            return;
        }

        const groupedAccounts = this.groupAccountsByTag(accounts);
        let html = '';

        Object.keys(groupedAccounts).sort().forEach(tag => {
            html += `<div class="tag-group">
                <div class="tag-header">${tag}</div>`;
            
            groupedAccounts[tag].forEach(account => {
                html += this.renderAccountCard(account);
            });
            
            html += '</div>';
        });

        container.innerHTML = html;
    }

    renderAccountCard(account) {
        const status = this.getAccountStatus(account);
        const paidInstallments = account.installments.filter(inst => inst.status === 'paid').length;
        const totalInstallments = account.installments.length;
        const totalPaid = account.installments
            .filter(inst => inst.status === 'paid')
            .reduce((sum, inst) => sum + inst.value, 0);

        return `
            <div class="account-card">
                <div class="account-header">
                    <div class="account-name">${account.name}</div>
                    <div class="account-actions">
                        <button class="btn-danger" onclick="accountManager.deleteAccount('${account.id}')">
                            Excluir
                        </button>
                    </div>
                </div>
                
                <div class="account-info">
                    <div class="info-item">
                        <div class="info-label">Valor Total</div>
                        <div class="info-value">R$ ${account.totalValue.toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Parcelas</div>
                        <div class="info-value">${paidInstallments}/${totalInstallments}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Valor Pago</div>
                        <div class="info-value">R$ ${totalPaid.toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Restante</div>
                        <div class="info-value">R$ ${(account.totalValue - totalPaid).toFixed(2)}</div>
                    </div>
                </div>

                <div class="installments-list">
                    <div class="installments-header">Parcelas:</div>
                    ${account.installments.map(installment => `
                        <div class="installment-item">
                            <div class="installment-info">
                                <span class="installment-number">Parcela ${installment.number}</span>
                                <span class="installment-value">R$ ${installment.value.toFixed(2)}</span>
                                <span class="installment-status ${installment.status}">
                                    ${installment.status === 'paid' ? 'Paga' : 'Pendente'}
                                </span>
                                <span>Venc: ${new Date(installment.dueDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div class="installment-actions">
                                <button class="btn-${installment.status === 'paid' ? 'secondary' : 'success'}" 
                                        onclick="accountManager.toggleInstallmentStatus('${account.id}', ${installment.number})">
                                    ${installment.status === 'paid' ? 'Desmarcar' : 'Marcar como Paga'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(this.accounts));
    }

    loadAccounts() {
        const saved = localStorage.getItem('accounts');
        const accounts = saved ? JSON.parse(saved) : [];
        
        // Adicionar data de criação para contas antigas que não têm
        return accounts.map(account => {
            if (!account.createdAt) {
                account.createdAt = new Date().toISOString().split('T')[0];
            }
            return account;
        });
    }

    // Gerenciamento de Tema
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeToggleIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.saveTheme(this.currentTheme);
        this.applyTheme();
        
        // Recriar gráficos com as novas cores se estiver na tela de estatísticas
        if (this.currentScreen === 'stats') {
            this.updateStats();
        }
    }

    updateThemeToggleIcon() {
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
    }

    // Navegação entre telas
    showMainScreen() {
        document.getElementById('mainScreen').classList.remove('hidden');
        document.getElementById('statsScreen').classList.add('hidden');
        this.currentScreen = 'main';
    }

    showStatsScreen() {
        document.getElementById('mainScreen').classList.add('hidden');
        document.getElementById('statsScreen').classList.remove('hidden');
        this.currentScreen = 'stats';
        this.initializeStats();
    }

    // Inicializar estatísticas
    initializeStats() {
        this.populateYearSelect();
        this.setCurrentMonthYear();
        this.updateStats();
    }

    populateYearSelect() {
        const yearSelect = document.getElementById('statsYear');
        const currentYear = new Date().getFullYear();
        const years = new Set();
        
        // Coletar anos das contas existentes
        this.accounts.forEach(account => {
            const year = new Date(account.createdAt).getFullYear();
            years.add(year);
        });
        
        // Adicionar anos dos últimos 5 anos
        for (let i = 0; i < 5; i++) {
            years.add(currentYear - i);
        }
        
        // Limpar e popular o select
        yearSelect.innerHTML = '';
        Array.from(years).sort((a, b) => b - a).forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    setCurrentMonthYear() {
        const now = new Date();
        document.getElementById('statsMonth').value = now.getMonth() + 1;
        document.getElementById('statsYear').value = now.getFullYear();
    }

    // Atualizar estatísticas
    updateStats() {
        const month = parseInt(document.getElementById('statsMonth').value);
        const year = parseInt(document.getElementById('statsYear').value);
        
        const filteredAccounts = this.getAccountsByMonthYear(month, year);
        const stats = this.calculateStats(filteredAccounts);
        
        this.updateSummaryCards(stats);
        this.updateCharts(filteredAccounts, month, year);
    }

    getAccountsByMonthYear(month, year) {
        return this.accounts.filter(account => {
            const accountDate = new Date(account.createdAt);
            return accountDate.getMonth() + 1 === month && accountDate.getFullYear() === year;
        });
    }

    calculateStats(accounts) {
        let totalPaid = 0;
        let totalPending = 0;
        let totalOverdue = 0;
        let totalSaved = 0;

        accounts.forEach(account => {
            const paidAmount = account.installments
                .filter(inst => inst.status === 'paid')
                .reduce((sum, inst) => sum + inst.value, 0);
            
            const pendingAmount = account.installments
                .filter(inst => inst.status === 'pending')
                .reduce((sum, inst) => sum + inst.value, 0);

            totalPaid += paidAmount;
            totalPending += pendingAmount;

            // Calcular atrasados
            const today = new Date();
            const overdueAmount = account.installments
                .filter(inst => {
                    return inst.status === 'pending' && new Date(inst.dueDate) < today;
                })
                .reduce((sum, inst) => sum + inst.value, 0);

            totalOverdue += overdueAmount;

            // Calcular economizado (valor total - valor pago)
            totalSaved += (account.totalValue - paidAmount);
        });

        return {
            totalPaid,
            totalPending,
            totalOverdue,
            totalSaved
        };
    }

    updateSummaryCards(stats) {
        document.getElementById('totalPaid').textContent = `R$ ${stats.totalPaid.toFixed(2)}`;
        document.getElementById('totalPending').textContent = `R$ ${stats.totalPending.toFixed(2)}`;
        document.getElementById('totalOverdue').textContent = `R$ ${stats.totalOverdue.toFixed(2)}`;
        document.getElementById('totalSaved').textContent = `R$ ${stats.totalSaved.toFixed(2)}`;
    }

    updateCharts(accounts, month, year) {
        this.createMonthlyChart(accounts, month, year);
        this.createCategoriesChart(accounts);
    }

    createMonthlyChart(accounts, month, year) {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        // Destruir gráfico anterior se existir
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        // Calcular gastos dos últimos 6 meses
        const monthlyData = [];
        const labels = [];
        
        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(year, month - 1 - i, 1);
            const targetMonth = targetDate.getMonth() + 1;
            const targetYear = targetDate.getFullYear();
            
            const monthAccounts = this.getAccountsByMonthYear(targetMonth, targetYear);
            const monthTotal = monthAccounts.reduce((sum, account) => {
                const paidAmount = account.installments
                    .filter(inst => inst.status === 'paid')
                    .reduce((sum, inst) => sum + inst.value, 0);
                return sum + paidAmount;
            }, 0);
            
            monthlyData.push(monthTotal);
            labels.push(targetDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
        }

        // Cores baseadas no tema
        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f1f5f9' : '#1e293b';
        const gridColor = isDark ? '#475569' : '#e2e8f0';

        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos (R$)',
                    data: monthlyData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });
    }

    createCategoriesChart(accounts) {
        const ctx = document.getElementById('categoriesChart').getContext('2d');
        
        // Destruir gráfico anterior se existir
        if (this.categoriesChart) {
            this.categoriesChart.destroy();
        }

        // Agrupar por tag
        const categoryData = {};
        accounts.forEach(account => {
            const paidAmount = account.installments
                .filter(inst => inst.status === 'paid')
                .reduce((sum, inst) => sum + inst.value, 0);
            
            if (paidAmount > 0) {
                if (!categoryData[account.tag]) {
                    categoryData[account.tag] = 0;
                }
                categoryData[account.tag] += paidAmount;
            }
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const colors = [
            'rgba(16, 185, 129, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(14, 165, 233, 0.8)',
            'rgba(34, 197, 94, 0.8)'
        ];

        // Cores baseadas no tema
        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#f1f5f9' : '#1e293b';
        const borderColor = isDark ? '#475569' : '#ffffff';

        this.categoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: borderColor
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: textColor
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#475569' : '#e2e8f0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.label + ': R$ ' + context.parsed.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }
}

// Inicializar o gerenciador quando a página carregar
let accountManager;
document.addEventListener('DOMContentLoaded', () => {
    accountManager = new AccountManager();
});
