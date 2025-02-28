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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Card,
  CardContent,
  DialogContentText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  RemoveCircleOutline as RemoveIcon,
  AddCircleOutline as AddItemIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';

// Interfaces
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  selling_price: number;
  category: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  payment_method: string;
  notes: string;
  created_at: string;
  created_by: string;
  client_id?: string;
  client?: {
    name: string;
  };
  sale_items: {
    id: string;
    inventory_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    inventory: {
      name: string;
    };
  }[];
}

export default function Sales() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const [openNewSaleDialog, setOpenNewSaleDialog] = useState(false);
  const [openSaleDetailsDialog, setOpenSaleDetailsDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openNewClientDialog, setOpenNewClientDialog] = useState(false);
  const [openEditSaleDialog, setOpenEditSaleDialog] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [selectedClient, setSelectedClient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [saleNotes, setSaleNotes] = useState('');
  
  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  
  // Edit sale form
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editClient, setEditClient] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventoryData, salesData, clientsData] = await Promise.all([
        supabase
          .from('inventory')
          .select('id, name, quantity, selling_price, category')
          .order('name', { ascending: true }),
        supabase
          .from('sales')
          .select(`
            *,
            client:client_id (name),
            sale_items(
              id,
              inventory_id,
              quantity,
              unit_price,
              total_price,
              inventory(name)
            )
          `)
          .order('sale_date', { ascending: false }),
        supabase
          .from('clients')
          .select('id, name, phone')
          .order('name', { ascending: true })
      ]);

      if (inventoryData.error) throw inventoryData.error;
      if (salesData.error) throw salesData.error;
      if (clientsData.error) throw clientsData.error;

      setInventory(inventoryData.data || []);
      setSales(salesData.data || []);
      setFilteredSales(salesData.data || []);
      setClients(clientsData.data || []);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = sales;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(sale => {
        const itemNames = sale.sale_items
          .map(item => item.inventory?.name?.toLowerCase() || '')
          .join(' ');
        
        const clientName = sale.client?.name?.toLowerCase() || '';
        
        return (
          itemNames.includes(searchTerm.toLowerCase()) ||
          clientName.includes(searchTerm.toLowerCase()) ||
          sale.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }
    
    setFilteredSales(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, startDate, endDate, sales]);

  const handleOpenNewSaleDialog = () => {
    setCart([]);
    setSelectedProduct('');
    setSelectedClient('');
    setProductQuantity(1);
    setPaymentMethod('Dinheiro');
    setSaleNotes('');
    setOpenNewSaleDialog(true);
  };

  const handleCloseNewSaleDialog = () => {
    setOpenNewSaleDialog(false);
  };

  const handleOpenSaleDetailsDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setOpenSaleDetailsDialog(true);
  };

  const handleCloseSaleDetailsDialog = () => {
    setOpenSaleDetailsDialog(false);
    setSelectedSale(null);
  };
  
  const handleOpenDeleteDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  
  const handleOpenNewClientDialog = () => {
    setNewClientName('');
    setNewClientPhone('');
    setOpenNewClientDialog(true);
  };
  
  const handleCloseNewClientDialog = () => {
    setOpenNewClientDialog(false);
  };
  
  const handleOpenEditSaleDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setEditPaymentMethod(sale.payment_method || 'Dinheiro');
    setEditNotes(sale.notes || '');
    setEditClient(sale.client_id || '');
    setOpenEditSaleDialog(true);
  };
  
  const handleCloseEditSaleDialog = () => {
    setOpenEditSaleDialog(false);
  };

  const handleProductChange = (event: SelectChangeEvent) => {
    setSelectedProduct(event.target.value);
    setProductQuantity(1);
  };
  
  const handleClientChange = (event: SelectChangeEvent) => {
    setSelectedClient(event.target.value);
  };
  
  const handleEditClientChange = (event: SelectChangeEvent) => {
    setEditClient(event.target.value);
  };

  const handlePaymentMethodChange = (event: SelectChangeEvent) => {
    setPaymentMethod(event.target.value);
  };
  
  const handleEditPaymentMethodChange = (event: SelectChangeEvent) => {
    setEditPaymentMethod(event.target.value);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || productQuantity <= 0) {
      setError('Selecione um produto e quantidade válida');
      return;
    }

    const product = inventory.find(item => item.id === selectedProduct);
    if (!product) {
      setError('Produto não encontrado');
      return;
    }

    if (productQuantity > product.quantity) {
      setError(`Quantidade indisponível. Estoque atual: ${product.quantity}`);
      return;
    }

    const existingCartItem = cart.find(item => item.id === product.id);
    
    if (existingCartItem) {
      // Update existing item
      const updatedCart = cart.map(item => {
        if (item.id === product.id) {
          const newQuantity = item.quantity + productQuantity;
          if (newQuantity > product.quantity) {
            setError(`Quantidade indisponível. Estoque atual: ${product.quantity}`);
            return item;
          }
          return {
            ...item,
            quantity: newQuantity,
            total_price: newQuantity * item.unit_price
          };
        }
        return item;
      });
      setCart(updatedCart);
    } else {
      // Add new item
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        quantity: productQuantity,
        unit_price: product.selling_price,
        total_price: productQuantity * product.selling_price
      };
      setCart([...cart, newItem]);
    }
    
    setSelectedProduct('');
    setProductQuantity(1);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleUpdateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    
    const product = inventory.find(item => item.id === productId);
    if (!product || newQuantity > product.quantity) {
      setError(`Quantidade indisponível. Estoque atual: ${product?.quantity || 0}`);
      return;
    }
    
    setCart(cart.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          total_price: newQuantity * item.unit_price
        };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };
  
  const handleSaveNewClient = async () => {
    if (!newClientName) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ 
          name: newClientName, 
          phone: newClientPhone || null, 
          created_by: user?.id 
        }])
        .select('id, name, phone')
        .single();

      if (error) throw error;

      setClients([...clients, data]);
      setSelectedClient(data.id);
      setSuccess('Cliente adicionado com sucesso!');
      handleCloseNewClientDialog();
    } catch (error) {
      setError('Erro ao adicionar novo cliente');
      console.error(error);
    }
  };
  
  // Phone mask function
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length <= 11) {
      // Format as (XX) X XXXX-XXXX
      if (value.length > 0) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      }
      if (value.length > 4) {
        value = value.replace(/(\) \d)(\d{4})(\d)/, '$1 $2-$3');
      }
      setNewClientPhone(value);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Adicione pelo menos um produto ao carrinho');
      return;
    }

    try {
      // 1. Create the sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_date: new Date().toISOString(),
          total_amount: calculateTotal(),
          payment_method: paymentMethod,
          notes: saleNotes,
          client_id: selectedClient || null,
          created_by: user?.id
        }])
        .select('id')
        .single();

      if (saleError) throw saleError;
      
      // 2. Create sale items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        inventory_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));
      
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
        
      if (itemsError) throw itemsError;
      
      // 3. Update inventory quantities
      for (const item of cart) {
        const inventoryItem = inventory.find(i => i.id === item.id);
        if (inventoryItem) {
          const newQuantity = inventoryItem.quantity - item.quantity;
          
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', item.id);
            
          if (updateError) throw updateError;
        }
      }
      
      // 4. Close dialog and refresh data
      setSuccess('Venda realizada com sucesso!');
      handleCloseNewSaleDialog();
      fetchData();
      
    } catch (error) {
      setError('Erro ao processar venda');
      console.error(error);
    }
  };
  
  const handleUpdateSale = async () => {
    if (!selectedSale) return;
    
    try {
      setLoading(true);
      
      // Update sale record
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          payment_method: editPaymentMethod,
          notes: editNotes,
          client_id: editClient || null
        })
        .eq('id', selectedSale.id);
      
      if (updateError) throw updateError;
      
      // Update related financial transaction
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .update({
          payment_method: editPaymentMethod
        })
        .eq('related_sale_id', selectedSale.id);
      
      if (transactionError) {
        console.error('Error updating related transaction:', transactionError);
        // Continue even if transaction update fails
      }
      
      setSuccess('Venda atualizada com sucesso!');
      handleCloseEditSaleDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao atualizar venda');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteSale = async () => {
    if (!selectedSale) return;
    
    try {
      setLoading(true);
      
      // First delete related financial transactions
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('related_sale_id', selectedSale.id);
      
      if (transactionError) {
        console.error('Error deleting related transaction:', transactionError);
        // Continue even if transaction deletion fails
      }
      
      // Then delete sale items
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', selectedSale.id);
        
      if (itemsError) throw itemsError;
      
      // Finally delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', selectedSale.id);
        
      if (saleError) throw saleError;
      
      setSuccess('Venda excluída com sucesso!');
      handleCloseDeleteDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao excluir venda');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
          Vendas
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenNewSaleDialog}
        >
          Nova Venda
        </Button>
      </Box>

      {/* Resumo de vendas */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total de Vendas
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {sales.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Receita Total
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              R$ {sales.reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Ticket Médio
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              R$ {sales.length > 0 
                ? (sales.reduce((sum, sale) => sum + sale.total_amount, 0) / sales.length).toFixed(2) 
                : '0.00'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar vendas..."
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
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Data Inicial"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
                setSearchTerm('');
              }}
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de vendas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Itens</TableCell>
              <TableCell>Forma de Pagamento</TableCell>
              <TableCell align="right">Valor Total</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{format(new Date(sale.sale_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    {sale.client ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        {sale.client.name}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Não informado
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {sale.sale_items.slice(0, 2).map(item => (
                      <div key={item.id}>
                        {item.quantity}x {item.inventory?.name}
                      </div>
                    ))}
                    {sale.sale_items.length > 2 && (
                      <Typography variant="body2" color="text.secondary">
                        +{sale.sale_items.length - 2} itens
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{sale.payment_method}</TableCell>
                  <TableCell align="right">R$ {sale.total_amount.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenSaleDetailsDialog(sale)}
                        size="small"
                        sx={{ mr: 1 }}
                        title="Ver detalhes"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenEditSaleDialog(sale)}
                        size="small"
                        sx={{ mr: 1 }}
                        title="Editar venda"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleOpenDeleteDialog(sale)}
                        size="small"
                        title="Excluir venda"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de nova venda */}
      <Dialog open={openNewSaleDialog} onClose={handleCloseNewSaleDialog} maxWidth="md" fullWidth>
        <DialogTitle>Nova Venda</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Produtos disponíveis */}
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle1" gutterBottom>
                Adicionar Produtos
              </Typography>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <FormControl fullWidth sx={{ mr: 1 }}>
                  <InputLabel id="product-label">Produto</InputLabel>
                  <Select
                    labelId="product-label"
                    value={selectedProduct}
                    label="Produto"
                    onChange={handleProductChange}
                  >
                    {inventory
                      .filter(item => item.quantity > 0)
                      .map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.name} - R$ {item.selling_price.toFixed(2)} ({item.quantity} em estoque)
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Qtd"
                  type="number"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseInt(e.target.value) || 0)}
                  InputProps={{ inputProps: { min: 1 } }}
                  sx={{ width: '80px' }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddToCart}
                  startIcon={<AddItemIcon />}
                  sx={{ ml: 1, whiteSpace: 'nowrap' }}
                >
                  Adicionar
                </Button>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={9}>
                  <FormControl fullWidth>
                    <InputLabel id="client-label">Cliente</InputLabel>
                    <Select
                      labelId="client-label"
                      value={selectedClient}
                      label="Cliente"
                      onChange={handleClientChange}
                    >
                      <MenuItem value="">Sem cliente</MenuItem>
                      {clients.map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={handleOpenNewClientDialog}
                    startIcon={<AddIcon />}
                    sx={{ height: '56px' }}
                  >
                    Novo
                  </Button>
                </Grid>
              </Grid>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="payment-method-label">Forma de Pagamento</InputLabel>
                <Select
                  labelId="payment-method-label"
                  value={paymentMethod}
                  label="Forma de Pagamento"
                  onChange={handlePaymentMethodChange}
                >
                  <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                  <MenuItem value="Cartão de Crédito">Cartão de Crédito</MenuItem>
                  <MenuItem value="Cartão de Débito">Cartão de Débito</MenuItem>
                  <MenuItem value="PIX">PIX</MenuItem>
                  <MenuItem value="Transferência">Transferência</MenuItem>
                  <MenuItem value="Boleto">Boleto</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                margin="normal"
                fullWidth
                label="Observações"
                multiline
                rows={2}
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
              />
            </Grid>
            
            {/* Carrinho */}
            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShoppingCartIcon sx={{ mr: 1 }} /> Carrinho
                  </Typography>
                  
                  {cart.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ my: 4, textAlign: 'center' }}>
                      Carrinho vazio
                    </Typography>
                  ) : (
                    <List>
                      {cart.map((item) => (
                        <div key={item.id}>
                          <ListItem>
                            <ListItemText
                              primary={item.name}
                              secondary={`R$ ${item.unit_price.toFixed(2)} x ${item.quantity} = R$ ${item.total_price.toFixed(2)}`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end" 
                                size="small"
                                onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity - 1)}
                              >
                                <RemoveIcon />
                              </IconButton>
                              <IconButton 
                                edge="end" 
                                size="small"
                                onClick={() => handleUpdateCartItemQuantity(item.id, item.quantity + 1)}
                                sx={{ mx: 1 }}
                              >
                                <AddItemIcon />
                              </IconButton>
                              <IconButton 
                                edge="end" 
                                size="small"
                                onClick={() => handleRemoveFromCart(item.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          <Divider />
                        </div>
                      ))}
                    </List>
                  )}
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total:</span>
                      <span>R$ {calculateTotal().toFixed(2)}</span>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseNewSaleDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCompleteSale} 
            variant="contained" 
            color="primary"
            startIcon={<ReceiptIcon />}
            disabled={cart.length === 0}
          >
            Finalizar Venda
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalhes da venda */}
      <Dialog open={openSaleDetailsDialog} onClose={handleCloseSaleDetailsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes da Venda</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedSale && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Data da Venda
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedSale.sale_date), 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Forma de Pagamento
                  </Typography>
                  <Typography variant="body1">
                    {selectedSale.payment_method}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cliente
                  </Typography>
                  <Typography variant="body1">
                    {selectedSale.client ? selectedSale.client.name : 'Não informado'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" gutterBottom>
                Itens
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="right">Qtd</TableCell>
                      <TableCell align="right">Preço Unit.</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSale.sale_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.inventory?.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">R$ {item.unit_price.toFixed(2)}</TableCell>
                        <TableCell align="right">R$ {item.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {selectedSale.notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Observações
                  </Typography>
                  <Typography variant="body1">
                    {selectedSale.notes}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total:</span>
                  <span>R$ {selectedSale.total_amount.toFixed(2)}</span>
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaleDetailsDialog}>Fechar</Button>
          <Button 
            color="primary" 
            startIcon={<EditIcon />} 
            onClick={() => {
              handleCloseSaleDetailsDialog();
              handleOpenEditSaleDialog(selectedSale!);
            }}
          >
            Editar
          </Button>
          <Button 
            color="error" 
            startIcon={<DeleteIcon />} 
            onClick={() => {
              handleCloseSaleDetailsDialog();
              handleOpenDeleteDialog(selectedSale!);
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal para adicionar novo cliente */}
      <Dialog open={openNewClientDialog} onClose={handleCloseNewClientDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Novo Cliente</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome"
            type="text"
            fullWidth
            variant="outlined"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            required
            sx={{ mb: 2, borderRadius: 16 }}
          />
          <TextField
            margin="dense"
            label="Telefone"
            type="tel"
            fullWidth
            variant="outlined"
            value={newClientPhone}
            onChange={handlePhoneChange}
            placeholder="(00) 0 0000-0000"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ borderRadius: 16 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseNewClientDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveNewClient} 
            variant="contained" 
            sx={{ 
              backgroundColor: 'primary.main', 
              '&:hover': { backgroundColor: 'primary.dark' },
              borderRadius: 16,
            }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de edição de venda */}
      <Dialog open={openEditSaleDialog} onClose={handleCloseEditSaleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Venda</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedSale && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Data da Venda: {format(new Date(selectedSale.sale_date), 'dd/MM/yyyy HH:mm')}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Valor Total: R$ {selectedSale.total_amount.toFixed(2)}
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="edit-client-label">Cliente</InputLabel>
                    <Select
                      labelId="edit-client-label"
                      value={editClient}
                      label="Cliente"
                      onChange={handleEditClientChange}
                    >
                      <MenuItem value="">Sem cliente</MenuItem>
                      {clients.map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="edit-payment-method-label">Forma de Pagamento</InputLabel>
                    <Select
                      labelId="edit-payment-method-label"
                      value={editPaymentMethod}
                      label="Forma de Pagamento"
                      onChange={handleEditPaymentMethodChange}
                    >
                      <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                      <MenuItem value="Cartão de Crédito">Cartão de Crédito</MenuItem>
                      <MenuItem value="Cartão de Débito">Cartão de Débito</MenuItem>
                      <MenuItem value="PIX">PIX</MenuItem>
                      <MenuItem value="Transferência">Transferência</MenuItem>
                      <MenuItem value="Boleto">Boleto</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observações"
                    multiline
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Nota: Não é possível editar os itens ou o valor total da venda. Para isso, exclua esta venda e crie uma nova.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseEditSaleDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateSale} 
            variant="contained" 
            color="primary"
          >
            Salvar Alterações
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
            Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e também removerá a transação financeira associada.
          </DialogContentText>
          {selectedSale && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Venda de {format(new Date(selectedSale.sale_date), 'dd/MM/yyyy HH:mm')}
              </Typography>
              <Typography variant="body2">
                Cliente: {selectedSale.client ? selectedSale.client.name : 'Não informado'}
              </Typography>
              <Typography variant="body2">
                Valor: R$ {selectedSale.total_amount.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Itens: {selectedSale.sale_items.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteSale} color="error" variant="contained" autoFocus>
            Excluir
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