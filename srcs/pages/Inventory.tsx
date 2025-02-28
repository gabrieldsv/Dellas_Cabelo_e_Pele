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
  SelectChangeEvent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Interface para itens do estoque
interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  category: string;
  created_at: string;
  created_by: string;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('0');
  const [itemCostPrice, setItemCostPrice] = useState('0');
  const [itemSellingPrice, setItemSellingPrice] = useState('0');
  const [itemCategory, setItemCategory] = useState('Geral');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(['Geral']);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setInventory(data || []);
      setFilteredItems(data || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data?.map(item => item.category || 'Geral') || ['Geral'])
      );
      setCategories(uniqueCategories);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = inventory;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredItems(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, categoryFilter, inventory]);

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setCurrentItem(item);
      setItemName(item.name);
      setItemQuantity(item.quantity.toString());
      setItemCostPrice(item.cost_price.toString());
      setItemSellingPrice(item.selling_price.toString());
      setItemCategory(item.category || 'Geral');
    } else {
      setCurrentItem(null);
      setItemName('');
      setItemQuantity('0');
      setItemCostPrice('0');
      setItemSellingPrice('0');
      setItemCategory('Geral');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenCategoryDialog = () => {
    setNewCategory('');
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
  };

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setItemCategory(newCategory);
    }
    handleCloseCategoryDialog();
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setItemCategory(event.target.value);
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent) => {
    setCategoryFilter(event.target.value);
  };

  const handleSaveItem = async () => {
    if (!itemName) {
      setError('Nome é obrigatório');
      return;
    }

    if (isNaN(Number(itemQuantity))) {
      setError('Quantidade inválida');
      return;
    }

    if (isNaN(Number(itemCostPrice)) || Number(itemCostPrice) < 0) {
      setError('Preço de custo inválido');
      return;
    }

    if (isNaN(Number(itemSellingPrice)) || Number(itemSellingPrice) < 0) {
      setError('Preço de venda inválido');
      return;
    }

    try {
      if (currentItem) {
        const { error } = await supabase
          .from('inventory')
          .update({ 
            name: itemName, 
            quantity: Number(itemQuantity),
            cost_price: Number(itemCostPrice),
            selling_price: Number(itemSellingPrice),
            category: itemCategory
          })
          .eq('id', currentItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([{ 
            name: itemName, 
            quantity: Number(itemQuantity),
            cost_price: Number(itemCostPrice),
            selling_price: Number(itemSellingPrice),
            category: itemCategory,
            created_by: user?.id 
          }]);

        if (error) throw error;
      }

      handleCloseDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao salvar item');
      console.error(error);
    }
  };

  const calculateProfit = (costPrice: number, sellingPrice: number) => {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
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
          Estoque
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Novo Item
        </Button>
      </Box>

      {/* Resumo do estoque */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total de Itens
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {inventory.reduce((sum, item) => sum + item.quantity, 0)} unidades
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Valor Total do Estoque
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              R$ {inventory.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Lucro Potencial
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              R$ {inventory.reduce((sum, item) => 
                sum + ((item.selling_price - item.cost_price) * item.quantity), 0).toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar por nome do produto..."
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
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="category-filter-label">Filtrar por Categoria</InputLabel>
              <Select
                labelId="category-filter-label"
                value={categoryFilter}
                label="Filtrar por Categoria"
                onChange={handleCategoryFilterChange}
              >
                <MenuItem value="">Todas as Categorias</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabela de estoque */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Quantidade</TableCell>
              <TableCell align="right">Preço de Custo</TableCell>
              <TableCell align="right">Preço de Venda</TableCell>
              <TableCell align="right">Lucro</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => {
              const profit = calculateProfit(item.cost_price, item.selling_price);
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Chip 
                      icon={<CategoryIcon fontSize="small" />} 
                      label={item.category || 'Geral'} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(248, 187, 208, 0.2)',
                        borderRadius: '16px'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    {item.quantity}
                    {item.quantity <= 5 && (
                      <Chip 
                        label={item.quantity === 0 ? "Esgotado" : "Estoque Baixo"} 
                        color={item.quantity === 0 ? "error" : "warning"} 
                        size="small" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">R$ {item.cost_price.toFixed(2)}</TableCell>
                  <TableCell align="right">R$ {item.selling_price.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {profit > 0 ? (
                        <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                      ) : (
                        <TrendingDownIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
                      )}
                      {profit.toFixed(2)}%
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleOpenDialog(item)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de item */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Produto"
            type="text"
            fullWidth
            variant="outlined"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
            sx={{ mb: 2, borderRadius: 16 }}
          />
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={9}>
              <FormControl fullWidth>
                <InputLabel id="category-label">Categoria</InputLabel>
                <Select
                  labelId="category-label"
                  value={itemCategory}
                  label="Categoria"
                  onChange={handleCategoryChange}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={handleOpenCategoryDialog}
                sx={{ height: '56px' }}
              >
                Nova
              </Button>
            </Grid>
          </Grid>
          
          <TextField
            margin="dense"
            label="Quantidade"
            type="number"
            fullWidth
            variant="outlined"
            value={itemQuantity}
            onChange={(e) => setItemQuantity(e.target.value)}
            sx={{ mb: 2, borderRadius: 16 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Preço de Custo"
                type="number"
                fullWidth
                variant="outlined"
                value={itemCostPrice}
                onChange={(e) => setItemCostPrice(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                sx={{ borderRadius: 16 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Preço de Venda"
                type="number"
                fullWidth
                variant="outlined"
                value={itemSellingPrice}
                onChange={(e) => setItemSellingPrice(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                sx={{ borderRadius: 16 }}
              />
            </Grid>
          </Grid>
          
          {Number(itemCostPrice) > 0 && Number(itemSellingPrice) > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Análise de Lucro
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Lucro por unidade: 
                    <Typography component="span" fontWeight="bold" sx={{ ml: 1 }}>
                      R$ {(Number(itemSellingPrice) - Number(itemCostPrice)).toFixed(2)}
                    </Typography>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Margem de lucro: 
                    <Typography 
                      component="span" 
                      fontWeight="bold" 
                      color={calculateProfit(Number(itemCostPrice), Number(itemSellingPrice)) > 0 ? 'success.main' : 'error.main'}
                      sx={{ ml: 1 }}
                    >
                      {calculateProfit(Number(itemCostPrice), Number(itemSellingPrice)).toFixed(2)}%
                    </Typography>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveItem} 
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

      {/* Modal para adicionar nova categoria */}
      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Nova Categoria</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome da Categoria"
            type="text"
            fullWidth
            variant="outlined"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Cancelar</Button>
          <Button onClick={handleAddCategory} variant="contained">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificação de erro */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
}