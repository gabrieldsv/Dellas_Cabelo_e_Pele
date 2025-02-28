import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  InputAdornment, 
  CircularProgress, 
  Snackbar, 
  Alert,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
  Card,
  CardContent,
  Tooltip,
  DialogContentText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  ArrowUpward as IncomeIcon,
  ArrowDownward as ExpenseIcon,
  FilterList as FilterIcon,
  PieChart as ChartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  payment_method: string;
  notes: string;
  related_sale_id: string | null;
  related_appointment_id: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Financial() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [openNewTransactionDialog, setOpenNewTransactionDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openDeleteLinkedDialog, setOpenDeleteLinkedDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [transactionType, setTransactionType] = useState('expense');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionPaymentMethod, setTransactionPaymentMethod] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date | null>(new Date());
  
  const [tabValue, setTabValue] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  // Colors for charts
  const COLORS = ['#f8bbd0', '#81d4fa', '#c8e6c9', '#ffe0b2', '#e1bee7', '#b39ddb', '#90caf9', '#ffcc80'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data?.map(item => item.category).filter(Boolean) || [])
      );
      setCategories(uniqueCategories);
      
      handleFilter(data || []);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (data = transactions) => {
    let filtered = data;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.category && transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (transaction.payment_method && transaction.payment_method.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(transaction => {
        try {
          const transactionDate = parseISO(transaction.transaction_date);
          return transactionDate >= startDate && transactionDate <= endDate;
        } catch (error) {
          console.error('Error filtering by date:', error);
          return false;
        }
      });
    }
    
    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter(transaction => transaction.type === typeFilter);
    }
    
    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(transaction => transaction.category === categoryFilter);
    }
    
    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, startDate, endDate, typeFilter, categoryFilter, transactions]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenNewTransactionDialog = (transaction?: Transaction) => {
    if (transaction) {
      // Edit mode
      setCurrentTransaction(transaction);
      setTransactionType(transaction.type);
      setTransactionAmount(transaction.amount.toString());
      setTransactionDescription(transaction.description);
      setTransactionCategory(transaction.category || '');
      setTransactionPaymentMethod(transaction.payment_method || '');
      setTransactionNotes(transaction.notes || '');
      setTransactionDate(new Date(transaction.transaction_date));
    } else {
      // New transaction mode
      setCurrentTransaction(null);
      setTransactionType('expense');
      setTransactionAmount('');
      setTransactionDescription('');
      setTransactionCategory('');
      setTransactionPaymentMethod('');
      setTransactionNotes('');
      setTransactionDate(new Date());
    }
    setOpenNewTransactionDialog(true);
  };

  const handleCloseNewTransactionDialog = () => {
    setOpenNewTransactionDialog(false);
  };

  const handleOpenDeleteDialog = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    
    if (transaction.related_sale_id || transaction.related_appointment_id) {
      setOpenDeleteLinkedDialog(true);
    } else {
      setOpenDeleteDialog(true);
    }
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  
  const handleCloseDeleteLinkedDialog = () => {
    setOpenDeleteLinkedDialog(false);
  };

  const handleTransactionTypeChange = (event: SelectChangeEvent) => {
    setTransactionType(event.target.value);
  };

  const handleTransactionCategoryChange = (event: SelectChangeEvent) => {
    setTransactionCategory(event.target.value);
  };

  const handleTransactionPaymentMethodChange = (event: SelectChangeEvent) => {
    setTransactionPaymentMethod(event.target.value);
  };

  const handleSaveTransaction = async () => {
    if (!transactionDescription || !transactionAmount || !transactionType || !transactionDate) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    if (isNaN(Number(transactionAmount)) || Number(transactionAmount) <= 0) {
      setError('Valor inválido');
      return;
    }

    try {
      if (currentTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from('financial_transactions')
          .update({
            transaction_date: transactionDate.toISOString(),
            description: transactionDescription,
            amount: Number(transactionAmount),
            type: transactionType,
            category: transactionCategory || null,
            payment_method: transactionPaymentMethod || null,
            notes: transactionNotes || null
          })
          .eq('id', currentTransaction.id);

        if (error) throw error;
        setSuccess('Transação atualizada com sucesso!');
      } else {
        // Create new transaction
        const { error } = await supabase
          .from('financial_transactions')
          .insert([{
            transaction_date: transactionDate.toISOString(),
            description: transactionDescription,
            amount: Number(transactionAmount),
            type: transactionType,
            category: transactionCategory || null,
            payment_method: transactionPaymentMethod || null,
            notes: transactionNotes || null,
            created_by: user?.id
          }]);

        if (error) throw error;
        setSuccess('Transação criada com sucesso!');
      }
      
      handleCloseNewTransactionDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao salvar transação');
      console.error(error);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!currentTransaction) return;

    try {
      // Check if this transaction is related to a sale or appointment
      if (currentTransaction.related_sale_id || currentTransaction.related_appointment_id) {
        setError('Esta transação está vinculada a uma venda ou agendamento e não pode ser excluída diretamente.');
        handleCloseDeleteDialog();
        return;
      }

      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', currentTransaction.id);

      if (error) throw error;
      
      setSuccess('Transação excluída com sucesso!');
      handleCloseDeleteDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao excluir transação');
      console.error(error);
    }
  };
  
  const handleDeleteLinkedTransaction = async () => {
    if (!currentTransaction) return;
    
    try {
      setLoading(true);
      
      if (currentTransaction.related_appointment_id) {
        // Delete appointment and its related transaction
        
        // 1. Delete appointment services
        const { error: servicesError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', currentTransaction.related_appointment_id);
          
        if (servicesError) throw servicesError;
        
        // 2. Delete the appointment
        const { error: appointmentError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', currentTransaction.related_appointment_id);
          
        if (appointmentError) throw appointmentError;
        
        // 3. Delete the financial transaction
        const { error: transactionError } = await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', currentTransaction.id);
          
        if (transactionError) throw transactionError;
        
        setSuccess('Agendamento e transação financeira excluídos com sucesso!');
      } 
      else if (currentTransaction.related_sale_id) {
        // Delete sale and its related transaction
        
        // 1. Delete sale items
        const { error: itemsError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', currentTransaction.related_sale_id);
          
        if (itemsError) throw itemsError;
        
        // 2. Delete the sale
        const { error: saleError } = await supabase
          .from('sales')
          .delete()
          .eq('id', currentTransaction.related_sale_id);
          
        if (saleError) throw saleError;
        
        // 3. Delete the financial transaction
        const { error: transactionError } = await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', currentTransaction.id);
          
        if (transactionError) throw transactionError;
        
        setSuccess('Venda e transação financeira excluídas com sucesso!');
      }
      
      handleCloseDeleteLinkedDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao excluir registros vinculados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate financial summary
  const calculateSummary = () => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      income,
      expense,
      balance: income - expense
    };
  };

  // Prepare data for charts
  const prepareChartData = () => {
    // Income by category
    const incomeByCategory = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const category = t.category || 'Sem categoria';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      
    // Expense by category
    const expenseByCategory = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Sem categoria';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
      
    return {
      income: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
      expense: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))
    };
  };

  const summary = calculateSummary();
  const chartData = prepareChartData();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'medium' }}>
          Financeiro
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenNewTransactionDialog()}
        >
          Nova Transação
        </Button>
      </Box>

      {/* Resumo financeiro */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '4px solid #c8e6c9' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Receitas
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              R$ {summary.income.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '4px solid #ffcdd2' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Despesas
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              R$ {summary.expense.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '4px solid #bbdefb' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Saldo
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold', 
                color: summary.balance >= 0 ? 'success.main' : 'error.main' 
              }}
            >
              R$ {summary.balance.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <DatePicker
              label="Data Inicial"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue || startOfMonth(new Date()))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue || endOfMonth(new Date()))}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel id="type-filter-label">Tipo</InputLabel>
              <Select
                labelId="type-filter-label"
                value={typeFilter}
                label="Tipo"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="income">Receitas</MenuItem>
                <MenuItem value="expense">Despesas</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel id="category-filter-label">Categoria</InputLabel>
              <Select
                labelId="category-filter-label"
                value={categoryFilter}
                label="Categoria"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => {
                setStartDate(startOfMonth(new Date()));
                setEndDate(endOfMonth(new Date()));
                setTypeFilter('');
                setCategoryFilter('');
                setSearchTerm('');
              }}
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="financial tabs">
            <Tab label="Transações" />
            <Tab label="Relatórios" />
          </Tabs>
        </Box>
        
        {/* Transactions Tab */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Forma de Pagamento</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        {transaction.category && (
                          <Chip 
                            label={transaction.category} 
                            size="small" 
                            sx={{ 
                              backgroundColor: transaction.type === 'income' ? 'rgba(200, 230, 201, 0.3)' : 'rgba(255, 205, 210, 0.3)',
                              borderRadius: '16px'
                            }} 
                          />
                        )}
                      </TableCell>
                      <TableCell>{transaction.payment_method}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {transaction.type === 'income' ? (
                            <IncomeIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                          ) : (
                            <ExpenseIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
                          )}
                          R$ {transaction.amount.toFixed(2)}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {transaction.related_sale_id || transaction.related_appointment_id ? (
                            <Tooltip title="Transações vinculadas não podem ser editadas diretamente">
                              <span>
                                <IconButton 
                                  color="primary" 
                                  disabled={true}
                                  size="small"
                                  sx={{ mr: 1 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : (
                            <IconButton 
                              color="primary" 
                              onClick={() => handleOpenNewTransactionDialog(transaction)}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          <IconButton 
                            color="error" 
                            onClick={() => handleOpenDeleteDialog(transaction)}
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nenhuma transação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        
        {/* Reports Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Income Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <IncomeIcon color="success" sx={{ mr: 1 }} /> Receitas por Categoria
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {chartData.income.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.income}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.income.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography color="text.secondary">Sem dados para exibir</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Expense Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <ExpenseIcon color="error" sx={{ mr: 1 }} /> Despesas por Categoria
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {chartData.expense.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.expense}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.expense.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Typography color="text.secondary">Sem dados para exibir</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Summary Cards */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resumo por Categoria
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Categoria</TableCell>
                          <TableCell align="right">Receitas</TableCell>
                          <TableCell align="right">Despesas</TableCell>
                          <TableCell align="right">Saldo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.from(new Set([
                          ...chartData.income.map(i => i.name),
                          ...chartData.expense.map(e => e.name)
                        ])).map(category => {
                          const incomeItem = chartData.income.find(i => i.name === category);
                          const expenseItem = chartData.expense.find(e => e.name === category);
                          const incomeValue = incomeItem ? incomeItem.value : 0;
                          const expenseValue = expenseItem ? expenseItem.value : 0;
                          const balance = incomeValue - expenseValue;
                          
                          return (
                            <TableRow key={category}>
                              <TableCell>{category}</TableCell>
                              <TableCell align="right" sx={{ color: 'success.main' }}>
                                {incomeValue > 0 ? `R$ ${incomeValue.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>
                                {expenseValue > 0 ? `R$ ${expenseValue.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell 
                                align="right" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: balance >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                R$ {balance.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>

      {/* Modal de transação (nova ou edição) */}
      <Dialog open={openNewTransactionDialog} onClose={handleCloseNewTransactionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="transaction-type-label">Tipo</InputLabel>
                <Select
                  labelId="transaction-type-label"
                  value={transactionType}
                  label="Tipo"
                  onChange={handleTransactionTypeChange}
                >
                  <MenuItem value="income">Receita</MenuItem>
                  <MenuItem value="expense">Despesa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor"
                type="number"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                required
                sx={{ mb: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Data"
                value={transactionDate}
                onChange={(newValue) => setTransactionDate(newValue)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    required: true,
                    sx: { mb: 2 }
                  } 
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="transaction-category-label">Categoria</InputLabel>
                <Select
                  labelId="transaction-category-label"
                  value={transactionCategory}
                  label="Categoria"
                  onChange={handleTransactionCategoryChange}
                >
                  {transactionType === 'income' ? (
                    [
                      <MenuItem key="servicos" value="Serviços">Serviços</MenuItem>,
                      <MenuItem key="vendas" value="Vendas">Vendas</MenuItem>,
                      <MenuItem key="outros" value="Outros">Outros</MenuItem>
                    ]
                  ) : (
                    [
                      <MenuItem key="aluguel" value="Aluguel">Aluguel</MenuItem>,
                      <MenuItem key="salarios" value="Salários">Salários</MenuItem>,
                      <MenuItem key="produtos" value="Produtos">Produtos</MenuItem>,
                      <MenuItem key="equipamentos" value="Equipamentos">Equipamentos</MenuItem>,
                      <MenuItem key="marketing" value="Marketing">Marketing</MenuItem>,
                      <MenuItem key="impostos" value="Impostos">Impostos</MenuItem>,
                      <MenuItem key="utilidades" value="Utilidades">Utilidades (Água, Luz, etc)</MenuItem>,
                      <MenuItem key="outros" value="Outros">Outros</MenuItem>
                    ]
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="payment-method-label">Forma de Pagamento</InputLabel>
                <Select
                  labelId="payment-method-label"
                  value={transactionPaymentMethod}
                  label="Forma de Pagamento"
                  onChange={handleTransactionPaymentMethodChange}
                >
                  {[
                    <MenuItem key="dinheiro" value="Dinheiro">Dinheiro</MenuItem>,
                    <MenuItem key="credito" value="Cartão de Crédito">Cartão de Crédito</MenuItem>,
                    <MenuItem key="debito" value="Cartão de Débito">Cartão de Débito</MenuItem>,
                    <MenuItem key="pix" value="PIX">PIX</MenuItem>,
                    <MenuItem key="transferencia" value="Transferência">Transferência</MenuItem>,
                    <MenuItem key="boleto" value="Boleto">Boleto</MenuItem>
                  ]}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseNewTransactionDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveTransaction} 
            variant="contained" 
            color={transactionType === 'income' ? 'success' : 'primary'}
          >
            {currentTransaction ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmar exclusão
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
          </DialogContentText>
          {currentTransaction && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {currentTransaction.description}
              </Typography>
              <Typography variant="body2">
                Data: {format(new Date(currentTransaction.transaction_date), 'dd/MM/yyyy')}
              </Typography>
              <Typography variant="body2">
                Valor: R$ {currentTransaction.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Tipo: {currentTransaction.type === 'income' ? 'Receita' : 'Despesa'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteTransaction} color="error" variant="contained" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de confirmação de exclusão de transação vinculada */}
      <Dialog
        open={openDeleteLinkedDialog}
        onClose={handleCloseDeleteLinkedDialog}
        aria-labelledby="linked-dialog-title"
        aria-describedby="linked-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="linked-dialog-title" sx={{ color: 'error.main' }}>
          Atenção: Exclusão de Registros Vinculados
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="linked-dialog-description" paragraph>
            Esta transação está vinculada a {currentTransaction?.related_appointment_id ? 'um agendamento' : 'uma venda'} e não pode ser excluída isoladamente.
          </DialogContentText>
          
          <DialogContentText paragraph sx={{ fontWeight: 'bold' }}>
            Ao prosseguir, você excluirá:
          </DialogContentText>
          
          <Box sx={{ pl: 2, mb: 2 }}>
            {currentTransaction?.related_appointment_id && (
              <>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  • O agendamento completo
                </Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  • Todos os serviços associados ao agendamento
                </Typography>
              </>
            )}
            
            {currentTransaction?.related_sale_id && (
              <>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  • A venda completa
                </Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  • Todos os itens associados à venda
                </Typography>
              </>
            )}
            
            <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
              • Esta transação financeira
            </Typography>
          </Box>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita e afetará múltiplos registros no sistema.
          </Alert>
          
          {currentTransaction && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {currentTransaction.description}
              </Typography>
              <Typography variant="body2">
                Data: {format(new Date(currentTransaction.transaction_date), 'dd/MM/yyyy')}
              </Typography>
              <Typography variant="body2">
                Valor: R$ {currentTransaction.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Tipo: {currentTransaction.type === 'income' ? 'Receita' : 'Despesa'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteLinkedDialog} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteLinkedTransaction} 
            color="error" 
            variant="contained" 
            autoFocus
            disabled={loading}
          >
            {loading ? 'Excluindo...' : 'Excluir Todos os Registros'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificação de erro */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>

      {/* Notificação de sucesso */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
}