import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress, 
  Card, 
  CardContent,
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  People, 
  Spa, 
  CalendarToday, 
  DateRange,
  ShoppingCart
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isWithinInterval, 
  startOfDay, 
  endOfDay,
  parseISO,
  isSameDay
} from 'date-fns';

// Tipagem para os dados
interface Appointment {
  id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: string;
  final_price: number;
  appointment_services: { service_id: string; final_price: number }[];
  created_by: string;
}

interface Sale {
  id: string;
  sale_date: string;
  total_amount: number;
  payment_method: string | null;
  notes: string | null;
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

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
}

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  type: string;
  category: string | null;
  related_sale_id: string | null;
  related_appointment_id: string | null;
  payment_method: string | null;
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [dateRange, setDateRange] = useState('month');
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [detailsData, setDetailsData] = useState<any[]>([]);
  const [detailsType, setDetailsType] = useState<'services' | 'sales' | 'all' | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Update date range when selection changes
    if (dateRange === 'day') {
      setStartDate(startOfDay(new Date()));
      setEndDate(endOfDay(new Date()));
    } else if (dateRange === 'week') {
      setStartDate(startOfWeek(new Date(), { weekStartsOn: 0 }));
      setEndDate(endOfWeek(new Date(), { weekStartsOn: 0 }));
    } else if (dateRange === 'month') {
      setStartDate(startOfMonth(new Date()));
      setEndDate(endOfMonth(new Date()));
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, clientsData, servicesData, inventoryData, salesData, transactionsData] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, appointment_services(service_id, services(name), final_price)')
          .order('start_time', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('services').select('*'),
        supabase.from('inventory').select('*'),
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
        supabase.from('financial_transactions').select('*')
      ]);

      if (appointmentsData.error) throw appointmentsData.error;
      if (clientsData.error) throw clientsData.error;
      if (servicesData.error) throw servicesData.error;
      if (inventoryData.error) throw inventoryData.error;
      if (salesData.error) throw salesData.error;
      if (transactionsData.error) throw transactionsData.error;

      setAppointments(appointmentsData.data || []);
      setClients(clientsData.data || []);
      setServices(servicesData.data || []);
      setInventory(inventoryData.data || []);
      setSales(salesData.data || []);
      setTransactions(transactionsData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments by date range
  const filteredAppointments = appointments.filter(appointment => {
    if (!startDate || !endDate) return true;
    
    try {
      const appointmentDate = parseISO(appointment.start_time);
      return isWithinInterval(appointmentDate, { start: startDate, end: endDate });
    } catch (error) {
      console.error('Error filtering appointment:', error);
      return false;
    }
  });

  // Filter sales by date range
  const filteredSales = sales.filter(sale => {
    if (!startDate || !endDate) return true;
    
    try {
      const saleDate = parseISO(sale.sale_date);
      return isWithinInterval(saleDate, { start: startDate, end: endDate });
    } catch (error) {
      console.error('Error filtering sale:', error);
      return false;
    }
  });

  // Filter transactions by date range
  const filteredTransactions = transactions.filter(transaction => {
    if (!startDate || !endDate) return true;
    
    try {
      const transactionDate = parseISO(transaction.transaction_date);
      return isWithinInterval(transactionDate, { start: startDate, end: endDate });
    } catch (error) {
      console.error('Error filtering transaction:', error);
      return false;
    }
  });

  // Calculate revenue for different periods
  const calculateRevenue = (period: 'day' | 'week' | 'month' | 'custom') => {
    let start: Date;
    let end: Date;
    
    if (period === 'day') {
      start = startOfDay(new Date());
      end = endOfDay(new Date());
    } else if (period === 'week') {
      start = startOfWeek(new Date(), { weekStartsOn: 0 });
      end = endOfWeek(new Date(), { weekStartsOn: 0 });
    } else if (period === 'month') {
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
    } else {
      // Custom period uses the selected date range
      start = startDate || startOfMonth(new Date());
      end = endDate || endOfMonth(new Date());
    }
    
    // Services revenue
    const servicesRevenue = appointments
      .filter(appointment => {
        try {
          const appointmentDate = parseISO(appointment.start_time);
          return isWithinInterval(appointmentDate, { start, end }) && 
                appointment.status === 'completed';
        } catch (error) {
          console.error('Error calculating service revenue:', error);
          return false;
        }
      })
      .reduce((total, appointment) => total + (appointment.final_price || 0), 0);
    
    // Sales revenue
    const salesRevenue = sales
      .filter(sale => {
        try {
          const saleDate = parseISO(sale.sale_date);
          return isWithinInterval(saleDate, { start, end });
        } catch (error) {
          console.error('Error calculating sales revenue:', error);
          return false;
        }
      })
      .reduce((total, sale) => total + (sale.total_amount || 0), 0);
    
    return {
      total: servicesRevenue + salesRevenue,
      services: servicesRevenue,
      sales: salesRevenue
    };
  };

  // Calculate inventory value and profit potential
  const inventoryValue = inventory.reduce((total, item) => total + (item.cost_price * item.quantity), 0);
  const inventoryPotentialProfit = inventory.reduce((total, item) => 
    total + ((item.selling_price - item.cost_price) * item.quantity), 0);

  // Data for the monthly appointments chart
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthAppointments = appointments.filter(appointment => {
      const date = new Date(appointment.start_time);
      return date.getMonth() + 1 === month;
    });
    
    const monthSales = sales.filter(sale => {
      const date = new Date(sale.sale_date);
      return date.getMonth() + 1 === month;
    });
    
    return {
      month: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }),
      Agendamentos: monthAppointments.length,
      ReceitaServicos: monthAppointments
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.final_price || 0), 0),
      ReceitaVendas: monthSales
        .reduce((sum, s) => sum + (s.total_amount || 0), 0)
    };
  });

  // Data for the services pie chart
  const serviceCounts: { [key: string]: number } = {};
  filteredAppointments.forEach(appointment => {
    appointment.appointment_services.forEach(as => {
      const serviceName = services.find(s => s.id === as.service_id)?.name || 'Desconhecido';
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    });
  });

  const popularServices = Object.entries(serviceCounts)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Upcoming appointments
  const upcomingAppointments = appointments
    .filter(appointment => {
      try {
        return new Date(appointment.start_time) >= new Date() && appointment.status === 'scheduled';
      } catch (error) {
        console.error('Error filtering upcoming appointments:', error);
        return false;
      }
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  // Colors for charts
  const COLORS = ['#f8bbd0', '#81d4fa', '#c8e6c9', '#ffe0b2', '#e1bee7'];

  // Today's appointments
  const todayAppointments = appointments.filter(appointment => {
    try {
      const appointmentDate = parseISO(appointment.start_time);
      return isSameDay(appointmentDate, new Date());
    } catch (error) {
      console.error('Error filtering today appointments:', error);
      return false;
    }
  });

  // Today's sales
  const todaySales = sales.filter(sale => {
    try {
      const saleDate = parseISO(sale.sale_date);
      return isSameDay(saleDate, new Date());
    } catch (error) {
      console.error('Error filtering today sales:', error);
      return false;
    }
  });

  // Handle revenue card click to show details
  const handleRevenueCardClick = (type: 'services' | 'sales' | 'all', period: 'day' | 'week' | 'month' | 'custom') => {
    let start: Date;
    let end: Date;
    let title = '';
    
    if (period === 'day') {
      start = startOfDay(new Date());
      end = endOfDay(new Date());
      title = type === 'all' 
        ? 'Receita Total do Dia' 
        : `Receita de ${type === 'services' ? 'Serviços' : 'Vendas'} do Dia`;
    } else if (period === 'week') {
      start = startOfWeek(new Date(), { weekStartsOn: 0 });
      end = endOfWeek(new Date(), { weekStartsOn: 0 });
      title = type === 'all' 
        ? 'Receita Total da Semana' 
        : `Receita de ${type === 'services' ? 'Serviços' : 'Vendas'} da Semana`;
    } else if (period === 'month') {
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
      title = type === 'all' 
        ? 'Receita Total do Mês' 
        : `Receita de ${type === 'services' ? 'Serviços' : 'Vendas'} do Mês`;
    } else {
      // Custom period uses the selected date range
      start = startDate || startOfMonth(new Date());
      end = endDate || endOfMonth(new Date());
      title = type === 'all' 
        ? 'Receita Total do Período' 
        : `Receita de ${type === 'services' ? 'Serviços' : 'Vendas'} do Período`;
    }
    
    let data: any[] = [];
    
    if (type === 'services' || type === 'all') {
      const servicesData = appointments
        .filter(appointment => {
          try {
            const appointmentDate = parseISO(appointment.start_time);
            return isWithinInterval(appointmentDate, { start, end }) && 
                 appointment.status === 'completed';
          } catch (error) {
            console.error('Error filtering services data:', error);
            return false;
          }
        })
        .map(appointment => {
          const client = clients.find(c => c.id === appointment.client_id);
          return {
            id: appointment.id,
            date: format(parseISO(appointment.start_time), 'dd/MM/yyyy HH:mm'),
            description: `Serviço: ${client?.name || 'Cliente não identificado'}`,
            client: client?.name || 'Desconhecido',
            services: appointment.appointment_services
              .map(as => services.find(s => s.id === as.service_id)?.name)
              .join(', '),
            amount: appointment.final_price,
            type: 'service'
          };
        });
        
      if (type === 'services') {
        data = servicesData;
      } else {
        data = [...data, ...servicesData];
      }
    }
    
    if (type === 'sales' || type === 'all') {
      const salesData = sales
        .filter(sale => {
          try {
            const saleDate = parseISO(sale.sale_date);
            return isWithinInterval(saleDate, { start, end });
          } catch (error) {
            console.error('Error filtering sales data:', error);
            return false;
          }
        })
        .map(sale => {
          return {
            id: sale.id,
            date: format(parseISO(sale.sale_date), 'dd/MM/yyyy HH:mm'),
            description: `Venda: ${sale.client?.name || 'Cliente não identificado'}`,
            client: sale.client?.name || 'Não informado',
            payment: sale.payment_method || 'Não informado',
            amount: sale.total_amount,
            type: 'sale'
          };
        });
        
      if (type === 'sales') {
        data = salesData;
      } else {
        data = [...data, ...salesData];
      }
    }
    
    // Sort by date (newest first)
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setDetailsTitle(title);
    setDetailsData(data);
    setDetailsType(type);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setDetailsData([]);
    setDetailsType(null);
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
      <Typography variant="h4" sx={{ fontWeight: 'medium', mb: 4 }}>
        Dashboard
      </Typography>

      {/* Date filter */}
      <Paper sx={{ p: 2, mb: 4, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          select
          label="Período"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="day">Hoje</MenuItem>
          <MenuItem value="week">Esta Semana</MenuItem>
          <MenuItem value="month">Este Mês</MenuItem>
          <MenuItem value="custom">Personalizado</MenuItem>
        </TextField>
        
        {dateRange === 'custom' && (
          <>
            <DatePicker 
              label="Data Inicial"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker 
              label="Data Final"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { size: 'small' } }}
            />
          </>
        )}
        
        <Button 
          variant="outlined" 
          onClick={fetchData}
          startIcon={<DateRange />}
        >
          Atualizar
        </Button>
      </Paper>

      {/* Revenue cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderLeft: '4px solid #f8bbd0',
              cursor: 'pointer',
              '&:hover': { boxShadow: 3 }
            }}
            onClick={() => handleRevenueCardClick('all', 'day')}
          >
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Receita do Dia
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
                R$ {calculateRevenue('day').total.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Serviços: R$ {calculateRevenue('day').services.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendas: R$ {calculateRevenue('day').sales.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderLeft: '4px solid #81d4fa',
              cursor: 'pointer',
              '&:hover': { boxShadow: 3 }
            }}
            onClick={() => handleRevenueCardClick('all', 'week')}
          >
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Receita da Semana
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
                R$ {calculateRevenue('week').total.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Serviços: R$ {calculateRevenue('week').services.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendas: R$ {calculateRevenue('week').sales.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderLeft: '4px solid #c8e6c9',
              cursor: 'pointer',
              '&:hover': { boxShadow: 3 }
            }}
            onClick={() => handleRevenueCardClick('all', 'month')}
          >
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Receita do Mês
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
                R$ {calculateRevenue('month').total.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Serviços: R$ {calculateRevenue('month').services.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendas: R$ {calculateRevenue('month').sales.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderLeft: '4px solid #ffe0b2',
              cursor: 'pointer',
              '&:hover': { boxShadow: 3 }
            }}
            onClick={() => handleRevenueCardClick('all', 'custom')}
          >
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Receita do Período
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold' }}>
                R$ {calculateRevenue('custom').total.toFixed(2)}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Serviços: R$ {calculateRevenue('custom').services.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vendas: R$ {calculateRevenue('custom').sales.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stats cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <People sx={{ color: 'primary.main', fontSize: 40 }} />
            <Box>
              <Typography variant="h6">{clients.length}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Clientes
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Spa sx={{ color: '#90caf9', fontSize: 40 }} />
            <Box>
              <Typography variant="h6">{services.length}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Serviços
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarToday sx={{ color: '#81d4fa', fontSize: 40 }} />
            <Box>
              <Typography variant="h6">{appointments.length}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Agendamentos
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <ShoppingCart sx={{ color: '#e1bee7', fontSize: 40 }} />
            <Box>
              <Typography variant="h6">{sales.length}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Vendas
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Receitas por Mês
            </Typography>
            <Box sx={{ height: 290, width: '100%', overflowX: 'auto' }}>
              <BarChart
                width={700}
                height={290}
                data={monthlyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="ReceitaServicos" name="Serviços" fill="#f8bbd0" />
                <Bar yAxisId="left" dataKey="ReceitaVendas" name="Vendas" fill="#81d4fa" />
                <Bar yAxisId="right" dataKey="Agendamentos" name="Qtd. Agendamentos" fill="#c8e6c9" />
              </BarChart>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Serviços Mais Populares
            </Typography>
            <Box sx={{ height: 290, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {popularServices.length > 0 ? (
                <PieChart width={300} height={290}>
                  <Pie
                    data={popularServices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {popularServices.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              ) : (
                <Typography color="text.secondary">
                  Nenhum serviço encontrado no período selecionado
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Inventory and Upcoming appointments */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Resumo do Estoque
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card sx={{ bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Valor Total
                    </Typography>
                    <Typography variant="h6">
                      R$ {inventoryValue.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Lucro Potencial
                    </Typography>
                    <Typography variant="h6">
                      R$ {inventoryPotentialProfit.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Produtos com Estoque Baixo
              </Typography>
              {inventory.filter(item => item.quantity < 5).length > 0 ? (
                inventory
                  .filter(item => item.quantity < 5)
                  .slice(0, 5)
                  .map(item => (
                    <Box key={item.id} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>{item.name}</Typography>
                      <Typography color={item.quantity <= 0 ? 'error' : 'warning.main'}>
                        {item.quantity} unidades
                      </Typography>
                    </Box>
                  ))
              ) : (
                <Typography color="text.secondary">
                  Nenhum produto com estoque baixo
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Próximos Agendamentos
            </Typography>
            {upcomingAppointments.length === 0 ? (
              <Typography color="text.secondary">
                Nenhum agendamento futuro encontrado.
              </Typography>
            ) : (
              upcomingAppointments.map(appointment => {
                const client = clients.find(c => c.id === appointment.client_id);
                const serviceNames = appointment.appointment_services
                  .map(as => services.find(s => s.id === as.service_id)?.name)
                  .join(', ');
                return (
                  <Box key={appointment.id} sx={{ mb: 2, p: 1, borderLeft: '3px solid #f8bbd0', bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle1">
                      {client?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(parseISO(appointment.start_time), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                    <Typography variant="body2">
                      Serviço: {serviceNames}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={handleCloseDetailsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{detailsTitle}</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailsData.length > 0 ? (
                  detailsData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.client}</TableCell>
                      <TableCell>{item.type === 'service' ? item.services : 'Venda de produtos'}</TableCell>
                      <TableCell align="right">R$ {item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Nenhum dado encontrado
                    </TableCell>
                  </TableRow>
                )}
                {detailsData.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                      Total:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      R$ {detailsData.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}