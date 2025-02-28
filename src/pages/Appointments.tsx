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
  DialogContentText,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  InputLabel,
  FormControl,
  Chip,
  Grid
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase'; // Supondo que o cliente Supabase esteja configurado
import { useAuth } from '../context/AuthContext'; // Contexto de autenticação
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ptBR } from 'date-fns/locale';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  parseISO 
} from 'date-fns';

// Interfaces para tipagem dos dados
interface Appointment {
  id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: string;
  final_price: number;
  appointment_services: { 
    id: string;
    service_id: string;
    price: number;
    final_price: number;
    services?: {
      name: string;
    };
  }[];
  created_by: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

export default function Appointments() {
  // Estados principais
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  // Estados para os diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openClientDialog, setOpenClientDialog] = useState(false);
  const [openServiceDialog, setOpenServiceDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);

  // Estados para formulários
  const [clientId, setClientId] = useState('');
  const [appointmentServices, setAppointmentServices] = useState<string[]>([]);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(new Date());
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('0');
  const [finalPrices, setFinalPrices] = useState<{[key: string]: string}>({});

  // Estados para filtros nos modais
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

  // Estados para filtro de datas
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [dateRange, setDateRange] = useState('month');

  // Carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, clientsData, servicesData] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            appointment_services(
              id, 
              service_id, 
              price, 
              final_price, 
              services(name)
            )
          `)
          .order('start_time', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('services').select('*')
      ]);

      if (appointmentsData.error) throw appointmentsData.error;
      if (clientsData.error) throw clientsData.error;
      if (servicesData.error) throw servicesData.error;

      setAppointments(appointmentsData.data || []);
      setFilteredAppointments(appointmentsData.data || []);
      setClients(clientsData.data || []);
      setFilteredClients(clientsData.data || []);
      setServices(servicesData.data || []);
      setFilteredServices(servicesData.data || []);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar intervalo de datas baseado na seleção do usuário
  useEffect(() => {
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

  // Função de filtragem
  const handleFilter = () => {
    let filtered = [...appointments];

    // Filtro por intervalo de datas
    if (startDate && endDate) {
      filtered = filtered.filter(appointment => {
        try {
          const appointmentDate = parseISO(appointment.start_time);
          return isWithinInterval(appointmentDate, { start: startDate, end: endDate });
        } catch (error) {
          console.error('Erro ao filtrar por data:', error);
          return false;
        }
      });
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(appointment => {
        const client = clients.find(c => c.id === appointment.client_id);
        const serviceNames = appointment.appointment_services
          .map(as => as.services?.name || services.find(s => s.id === as.service_id)?.name || '')
          .join(', ');

        return (
          client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client?.phone && client.phone.includes(searchTerm)) ||
          serviceNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    setFilteredAppointments(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, appointments, clients, services, startDate, endDate]);

  // Filtrar clientes no modal
  const handleFilterClients = () => {
    setFilteredClients(
      clientSearchTerm
        ? clients.filter(client => 
            client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
            (client.phone && client.phone.includes(clientSearchTerm))
          )
        : clients
    );
  };

  // Filtrar serviços no modal
  const handleFilterServices = () => {
    setFilteredServices(
      serviceSearchTerm
        ? services.filter(service => 
            service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
            service.price.toString().includes(serviceSearchTerm)
          )
        : services
    );
  };

  useEffect(() => {
    handleFilterClients();
  }, [clientSearchTerm, clients]);

  useEffect(() => {
    handleFilterServices();
  }, [serviceSearchTerm, services]);

  // Funções para manipulação de diálogos
  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setCurrentAppointment(appointment);
      setClientId(appointment.client_id);
      setAppointmentServices(appointment.appointment_services.map(as => as.service_id));
      setAppointmentDate(new Date(appointment.start_time));
    } else {
      setCurrentAppointment(null);
      setClientId('');
      setAppointmentServices([]);
      setAppointmentDate(new Date());
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewServiceName('');
    setNewServicePrice('0');
    setClientSearchTerm('');
    setServiceSearchTerm('');
  };

  const handleCloseClientDialog = () => setOpenClientDialog(false);
  const handleCloseServiceDialog = () => setOpenServiceDialog(false);
  const handleCloseCompleteDialog = () => {
    setOpenCompleteDialog(false);
    setFinalPrices({});
  };
  const handleOpenDeleteDialog = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setOpenDeleteDialog(true);
  };
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false);

  // Salvar agendamento
  const handleSaveAppointment = async () => {
    if (!clientId || appointmentServices.length === 0 || !appointmentDate) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    try {
      const totalDurationMinutes = appointmentServices.length * 30;
      const startDate = new Date(appointmentDate);
      const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60000);
      let appointmentId: string;

      if (currentAppointment) {
        const { error, data } = await supabase
          .from('appointments')
          .update({ 
            client_id: clientId, 
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString() 
          })
          .eq('id', currentAppointment.id)
          .select('id')
          .single();

        if (error) throw error;
        appointmentId = data.id;
      } else {
        const { error, data } = await supabase
          .from('appointments')
          .insert([{ 
            client_id: clientId, 
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            status: 'scheduled',
            created_by: user?.id 
          }])
          .select('id')
          .single();

        if (error) throw error;
        appointmentId = data.id;
      }

      await supabase.from('appointment_services').delete().eq('appointment_id', appointmentId);

      const servicesToInsert = appointmentServices.map(serviceId => ({
        appointment_id: appointmentId,
        service_id: serviceId,
        price: services.find(s => s.id === serviceId)?.price || 0,
        final_price: 0
      }));

      const { error: servicesError } = await supabase.from('appointment_services').insert(servicesToInsert);
      if (servicesError) throw servicesError;

      setSuccess('Agendamento salvo com sucesso!');
      handleCloseDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao salvar agendamento');
      console.error(error);
    }
  };

  // Salvar novo cliente
  const handleSaveNewClient = async () => {
    if (!newClientName) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      const { error, data } = await supabase
        .from('clients')
        .insert([{ name: newClientName, phone: newClientPhone || null, created_by: user?.id }])
        .select('id, name, phone')
        .single();

      if (error) throw error;

      setClients([...clients, data]);
      setFilteredClients([...filteredClients, data]);
      setClientId(data.id);
      handleCloseClientDialog();
    } catch (error) {
      setError('Erro ao adicionar novo cliente');
      console.error(error);
    }
  };

  // Salvar novo serviço
  const handleSaveNewService = async () => {
    if (!newServiceName || !newServicePrice) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (isNaN(Number(newServicePrice)) || Number(newServicePrice) < 0) {
      setError('Preço inválido');
      return;
    }

    try {
      const { error, data } = await supabase
        .from('services')
        .insert([{ name: newServiceName, price: Number(newServicePrice), created_by: user?.id }])
        .select('id, name, price')
        .single();

      if (error) throw error;

      setServices([...services, data]);
      setFilteredServices([...filteredServices, data]);
      setAppointmentServices([...appointmentServices, data.id]);
      handleCloseServiceDialog();
    } catch (error) {
      setError('Erro ao adicionar novo serviço');
      console.error(error);
    }
  };

  // Finalizar agendamento
  const handleCompleteAppointment = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    const initialPrices: {[key: string]: string} = {};
    appointment.appointment_services.forEach(service => {
      initialPrices[service.id] = service.price.toString();
    });
    setFinalPrices(initialPrices);
    setOpenCompleteDialog(true);
  };

  const handleSaveCompletedAppointment = async () => {
    if (!currentAppointment) return;

    try {
      const totalFinalPrice = Object.values(finalPrices).reduce((sum, price) => sum + (Number(price) || 0), 0);
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'completed', final_price: totalFinalPrice })
        .eq('id', currentAppointment.id);

      if (appointmentError) throw appointmentError;

      for (const serviceId in finalPrices) {
        const { error: serviceError } = await supabase
          .from('appointment_services')
          .update({ final_price: Number(finalPrices[serviceId]) || 0 })
          .eq('id', serviceId);

        if (serviceError) throw serviceError;
      }

      setSuccess('Agendamento finalizado com sucesso!');
      handleCloseCompleteDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao finalizar agendamento');
      console.error(error);
    }
  };

  // Cancelar agendamento
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      setSuccess('Agendamento cancelado com sucesso!');
      fetchData();
    } catch (error) {
      setError('Erro ao cancelar agendamento');
      console.error(error);
    }
  };

  // Excluir agendamento
  const handleDeleteAppointment = async () => {
    if (!currentAppointment) return;

    try {
      setLoading(true);
      await supabase.from('appointment_services').delete().eq('appointment_id', currentAppointment.id);
      const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', currentAppointment.id);

      if (appointmentError) throw appointmentError;

      setSuccess('Agendamento excluído com sucesso!');
      handleCloseDeleteDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao excluir agendamento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Formatação de status
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'scheduled': return <Chip label="Agendado" color="primary" size="small" />;
      case 'completed': return <Chip label="Concluído" color="success" size="small" />;
      case 'cancelled': return <Chip label="Cancelado" color="error" size="small" />;
      default: return <Chip label={status} size="small" />;
    }
  };

  // Máscara de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      if (value.length > 4) value = value.replace(/(\) \d)(\d{4})(\d)/, '$1 $2-$3');
      setNewClientPhone(value);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.substring(0, 2)}) ${digits.substring(2, 3)} ${digits.substring(3, 7)}-${digits.substring(7)}`;
    if (digits.length === 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    return phone;
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
        <Typography variant="h4" sx={{ fontWeight: 'medium' }}>Agendamentos</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
        >
          Novo Agendamento
        </Button>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          variant="outlined"
          placeholder="Buscar por nome, telefone, serviço ou status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 1 }}>
                <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
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
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
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
          </LocalizationProvider>
        )}

        <Button 
          variant="outlined" 
          onClick={fetchData}
          startIcon={<DateRangeIcon />}
        >
          Atualizar
        </Button>
      </Paper>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Serviços</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAppointments.map((appointment) => {
              const client = clients.find(c => c.id === appointment.client_id) || { name: 'Desconhecido', phone: '' };
              return (
                <TableRow key={appointment.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>
                    {client.phone ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        {formatPhoneDisplay(client.phone)}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Não informado</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {appointment.appointment_services.map(as => 
                      as.services?.name || services.find(s => s.id === as.service_id)?.name || ''
                    ).join(', ')}
                  </TableCell>
                  <TableCell>{new Date(appointment.start_time).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{getStatusChip(appointment.status)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {appointment.status === 'scheduled' && (
                        <>
                          <IconButton 
                            color="success" 
                            onClick={() => handleCompleteAppointment(appointment)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => handleCancelAppointment(appointment.id)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            <CancelIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenDialog(appointment)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleOpenDeleteDialog(appointment)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de agendamento */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Cliente</InputLabel>
            <Select
              value={clientId}
              onChange={(e) => setClientId(e.target.value as string)}
              label="Cliente"
            >
              <MenuItem value="" disabled>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => { e.stopPropagation(); setClientSearchTerm(e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{ mb: 1 }}
                />
              </MenuItem>
              {filteredClients.map(client => (
                <MenuItem key={client.id} value={client.id}>
                  <Box>
                    <Typography variant="body1">{client.name}</Typography>
                    {client.phone && (
                      <Typography variant="caption" color="text.secondary">{formatPhoneDisplay(client.phone)}</Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Serviços</InputLabel>
            <Select
              multiple
              value={appointmentServices}
              onChange={(e) => setAppointmentServices(e.target.value as string[])}
              renderValue={(selected) => selected.map(id => services.find(s => s.id === id)?.name).join(', ')}
              label="Serviços"
            >
              <MenuItem value="" disabled>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Buscar serviço..."
                  value={serviceSearchTerm}
                  onChange={(e) => { e.stopPropagation(); setServiceSearchTerm(e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{ mb: 1 }}
                />
              </MenuItem>
              {filteredServices.map(service => (
                <MenuItem key={service.id} value={service.id}>
                  <Checkbox checked={appointmentServices.includes(service.id)} />
                  <ListItemText primary={service.name} secondary={`R$ ${service.price.toFixed(2)}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <DateTimePicker
              label="Data e Hora"
              value={appointmentDate}
              onChange={(newValue) => setAppointmentDate(newValue)}
              slotProps={{ textField: { fullWidth: true, sx: { mt: 2 } } }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setOpenClientDialog(true)} variant="contained">Adicionar Novo Cliente</Button>
            <Button onClick={() => setOpenServiceDialog(true)} variant="contained">Adicionar Novo Serviço</Button>
            <Button onClick={handleSaveAppointment} variant="contained" color="primary">Salvar</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Modal novo cliente */}
      <Dialog open={openClientDialog} onClose={handleCloseClientDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Novo Cliente</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome"
            fullWidth
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Telefone"
            fullWidth
            value={newClientPhone}
            onChange={handlePhoneChange}
            placeholder="(00) 0 0000-0000"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClientDialog}>Cancelar</Button>
          <Button onClick={handleSaveNewClient} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal novo serviço */}
      <Dialog open={openServiceDialog} onClose={handleCloseServiceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Novo Serviço</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Serviço"
            fullWidth
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Preço"
            type="number"
            fullWidth
            value={newServicePrice}
            onChange={(e) => setNewServicePrice(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseServiceDialog}>Cancelar</Button>
          <Button onClick={handleSaveNewService} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal finalizar agendamento */}
      <Dialog open={openCompleteDialog} onClose={handleCloseCompleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizar Agendamento</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Informe o valor final de cada serviço:</Typography>
          {currentAppointment?.appointment_services.map(service => (
            <Box key={service.id} sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {service.services?.name || services.find(s => s.id === service.service_id)?.name || 'Serviço'}
              </Typography>
              <TextField
                fullWidth
                label="Valor Final"
                type="number"
                value={finalPrices[service.id] || ''}
                onChange={(e) => setFinalPrices({ ...finalPrices, [service.id]: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                size="small"
              />
            </Box>
          ))}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="subtitle1">
              Valor Total: R$ {Object.values(finalPrices).reduce((sum, price) => sum + (Number(price) || 0), 0).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog}>Cancelar</Button>
          <Button onClick={handleSaveCompletedAppointment} variant="contained" color="success">Finalizar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal excluir agendamento */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>Tem certeza que deseja excluir este agendamento? Esta ação não pode be desfeita.</DialogContentText>
          {currentAppointment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography>Cliente: {clients.find(c => c.id === currentAppointment.client_id)?.name || 'Desconhecido'}</Typography>
              <Typography>Data: {new Date(currentAppointment.start_time).toLocaleString('pt-BR')}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteAppointment} color="error" variant="contained" disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificações */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
}