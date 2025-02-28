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
  Theme,
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
  Phone as PhoneIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';

// Interfaces para os dados
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openClientDialog, setOpenClientDialog] = useState(false);
  const [openServiceDialog, setOpenServiceDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [clientId, setClientId] = useState('');
  const [appointmentServices, setAppointmentServices] = useState<string[]>([]);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(new Date());
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('0');
  const [finalPrices, setFinalPrices] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  
  // Search fields for modals
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

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

  const handleFilter = () => {
    let filtered = [...appointments];
    
    if (searchTerm) {
      filtered = filtered.filter(appointment => {
        const client = clients.find(c => c.id === appointment.client_id);
        const serviceNames = appointment.appointment_services
          .map(as => {
            // Check if services property exists and has name
            if (as.services && as.services.name) {
              return as.services.name;
            }
            // Fallback to finding service by ID
            return services.find(s => s.id === as.service_id)?.name || '';
          })
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

  // Filter clients in the client selection modal
  const handleFilterClients = () => {
    if (!clientSearchTerm) {
      setFilteredClients(clients);
      return;
    }
    
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(clientSearchTerm))
    );
    
    setFilteredClients(filtered);
  };
  
  // Filter services in the service selection modal
  const handleFilterServices = () => {
    if (!serviceSearchTerm) {
      setFilteredServices(services);
      return;
    }
    
    const filtered = services.filter(service => 
      service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      service.price.toString().includes(serviceSearchTerm)
    );
    
    setFilteredServices(filtered);
  };
  
  useEffect(() => {
    handleFilterClients();
  }, [clientSearchTerm, clients]);
  
  useEffect(() => {
    handleFilterServices();
  }, [serviceSearchTerm, services]);

  useEffect(() => {
    handleFilter();
  }, [searchTerm, appointments, clients, services]);

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

  const handleCloseClientDialog = () => {
    setOpenClientDialog(false);
    setNewClientName('');
    setNewClientPhone('');
  };

  const handleCloseServiceDialog = () => {
    setOpenServiceDialog(false);
    setNewServiceName('');
    setNewServicePrice('0');
  };

  const handleCloseCompleteDialog = () => {
    setOpenCompleteDialog(false);
    setFinalPrices({});
  };

  const handleOpenDeleteDialog = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleSaveAppointment = async () => {
    if (!clientId || appointmentServices.length === 0 || !appointmentDate) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    try {
      let appointmentId: string;

      // Calcular end_time (30 minutos por serviço)
      const totalDurationMinutes = appointmentServices.length * 30;

      const startDate = new Date(appointmentDate);
      const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60000);

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

      await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', appointmentId);

      const servicesToInsert = appointmentServices.map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return {
          appointment_id: appointmentId,
          service_id: serviceId,
          price: service?.price || 0,
          final_price: 0
        };
      });

      const { error: servicesError } = await supabase
        .from('appointment_services')
        .insert(servicesToInsert);

      if (servicesError) throw servicesError;

      setSuccess('Agendamento salvo com sucesso!');
      handleCloseDialog();
      fetchData();
    } catch (error) {
      setError('Erro ao salvar agendamento');
      console.error(error);
    }
  };

  const handleSaveNewClient = async () => {
    if (!newClientName) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      const { error, data } = await supabase
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
      setFilteredClients([...filteredClients, data]);
      setClientId(data.id);
      handleCloseClientDialog();
    } catch (error) {
      setError('Erro ao adicionar novo cliente');
      console.error(error);
    }
  };

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
        .insert([{ 
          name: newServiceName, 
          price: Number(newServicePrice),
          created_by: user?.id 
        }])
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

  const handleAddNewClient = () => {
    setOpenClientDialog(true);
  };

  const handleAddNewService = () => {
    setOpenServiceDialog(true);
  };

  const handleCompleteAppointment = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    
    // Initialize final prices with the original prices
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
      // Calculate total final price
      const totalFinalPrice = Object.values(finalPrices).reduce(
        (sum, price) => sum + (Number(price) || 0), 
        0
      );
      
      // Update appointment status and final price
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          final_price: totalFinalPrice
        })
        .eq('id', currentAppointment.id);
      
      if (appointmentError) throw appointmentError;
      
      // Update each service's final price
      for (const serviceId in finalPrices) {
        const { error: serviceError } = await supabase
          .from('appointment_services')
          .update({ 
            final_price: Number(finalPrices[serviceId]) || 0
          })
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

  const handleDeleteAppointment = async () => {
    if (!currentAppointment) return;
    
    try {
      setLoading(true);
      
      // First delete related financial transactions
      const { error: transactionError } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('related_appointment_id', currentAppointment.id);
      
      if (transactionError) {
        console.error('Erro ao excluir transação financeira:', transactionError);
        // Continue even if transaction deletion fails
      }
      
      // Then delete appointment services
      const { error: servicesError } = await supabase
        .from('appointment_services')
        .delete()
        .eq('appointment_id', currentAppointment.id);
        
      if (servicesError) throw servicesError;
      
      // Finally delete the appointment
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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Chip label="Agendado" color="primary" size="small" />;
      case 'completed':
        return <Chip label="Concluído" color="success" size="small" />;
      case 'cancelled':
        return <Chip label="Cancelado" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
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

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return '';
    
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 3)} ${digits.substring(3, 7)}-${digits.substring(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
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
        <Typography variant="h4" sx={{ fontWeight: 'medium' }}>
          Agendamentos
        </Typography>
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
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }}>
        <TextField
          fullWidth
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
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: '#fff',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
              '&.Mui-focused': {
                boxShadow: '0px 0px 0px 2px rgba(0, 0, 0, 0.1)',
              },
            },
            '& .MuiInputBase-input': {
              padding: '10px 14px',
              color: 'text.secondary',
            },
          }}
        />
      </Paper>
      
      {/* Tabela de agendamentos */}
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
                      <Typography variant="body2" color="text.secondary">
                        Não informado
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {appointment.appointment_services.map(as => 
                      as.services?.name || services.find(service => service.id === as.service_id)?.name
                    ).join(', ')}
                  </TableCell>
                  <TableCell>{new Date(appointment.start_time).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    {getStatusChip(appointment.status)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {appointment.status === 'scheduled' && (
                        <>
                          <IconButton 
                            color="success" 
                            onClick={() => handleCompleteAppointment(appointment)}
                            size="small"
                            sx={{ mr: 1 }}
                            title="Finalizar agendamento"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => handleCancelAppointment(appointment.id)}
                            size="small"
                            sx={{ mr: 1 }}
                            title="Cancelar agendamento"
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
                        title="Editar agendamento"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleOpenDeleteDialog(appointment)}
                        size="small"
                        title="Excluir agendamento"
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
            <InputLabel id="client-label">Cliente</InputLabel>
            <Select
              labelId="client-label"
              value={clientId}
              onChange={(e) => setClientId(e.target.value as string)}
              label="Cliente"
              sx={(theme: Theme) => ({
                borderRadius: 16,
                '& .MuiOutlinedInput-root': {
                  border: `2px solid ${theme.palette.primary.main}`,
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                  },
                  '&.Mui-focused': {
                    borderColor: theme.palette.primary.dark,
                  },
                },
              })}
            >
              {/* Add search field inside the Select */}
              <MenuItem value="" disabled>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    e.stopPropagation(); // Prevent closing the dropdown
                    setClientSearchTerm(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent closing the dropdown
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 1 }}
                />
              </MenuItem>
              
              {filteredClients.map(client => (
                <MenuItem key={client.id} value={client.id}>
                  <Box>
                    <Typography variant="body1">{client.name}</Typography>
                    {client.phone && (
                      <Typography variant="caption" color="text.secondary">
                        {formatPhoneDisplay(client.phone)}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="services-label">Serviços</InputLabel>
            <Select
              labelId="services-label"
              multiple
              value={appointmentServices}
              onChange={(e) => setAppointmentServices(e.target.value as string[])}
              renderValue={(selected) => 
                selected.map(id => services.find(service => service.id === id)?.name).join(', ')
              }
              label="Serviços"
              sx={{ borderRadius: 16 }}
            >
              {/* Add search field inside the Select */}
              <MenuItem value="" disabled>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Buscar serviço..."
                  value={serviceSearchTerm}
                  onChange={(e) => {
                    e.stopPropagation(); // Prevent closing the dropdown
                    setServiceSearchTerm(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent closing the dropdown
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 1 }}
                />
              </MenuItem>
              
              {filteredServices.map(service => (
                <MenuItem key={service.id} value={service.id}>
                  <Checkbox checked={appointmentServices.includes(service.id)} />
                  <ListItemText 
                    primary={service.name} 
                    secondary={`R$ ${service.price.toFixed(2)}`} 
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <DateTimePicker
              label="Data e Hora"
              value={appointmentDate}
              onChange={(newValue: Date | null) => setAppointmentDate(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: { 
                    mt: 2, 
                    borderRadius: 16,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 16,
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleAddNewClient} 
              variant="contained" 
              sx={{ 
                backgroundColor: '#c8e6c9',
                '&:hover': { backgroundColor: '#a5d6a7' },
                borderRadius: 16,
              }}
            >
              Adicionar Novo Cliente
            </Button>
            <Button 
              onClick={handleAddNewService} 
              variant="contained" 
              sx={{ 
                backgroundColor: '#b3e5fc',
                '&:hover': { backgroundColor: '#90caf9' },
                borderRadius: 16,
              }}
            >
              Adicionar Novo Serviço
            </Button>
            <Button 
              onClick={handleSaveAppointment} 
              variant="contained" 
              sx={{ 
                backgroundColor: 'primary.main', 
                '&:hover': { backgroundColor: 'primary.dark' },
                borderRadius: 16,
              }}
            >
              Salvar
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Modal para adicionar novo cliente */}
      <Dialog open={openClientDialog} onClose={handleCloseClientDialog} maxWidth="sm" fullWidth>
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
                  <PhoneIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ borderRadius: 16 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseClientDialog} sx={{ color: 'text.secondary' }}>
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

      {/* Modal para adicionar novo serviço */}
      <Dialog open={openServiceDialog} onClose={handleCloseServiceDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Novo Serviço</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Serviço"
            type="text"
            fullWidth
            variant="outlined"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            required
            sx={{ mb: 2, borderRadius: 16 }}
          />
          <TextField
            margin="dense"
            label="Preço"
            type="number"
            fullWidth
            variant="outlined"
            value={newServicePrice}
            onChange={(e) => setNewServicePrice(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            }}
            sx={{ borderRadius: 16 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseServiceDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveNewService} 
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

      {/* Modal para finalizar agendamento */}
      <Dialog open={openCompleteDialog} onClose={handleCloseCompleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Finalizar Agendamento</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Informe o valor final de cada serviço:
          </Typography>
          
          {currentAppointment?.appointment_services.map(service => {
            const serviceName = service.services?.name || 
              services.find(s => s.id === service.service_id)?.name || 'Serviço';
            return (
              <Box key={service.id} sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {serviceName}
                </Typography>
                <TextField
                  fullWidth
                  label="Valor Final"
                  type="number"
                  variant="outlined"
                  value={finalPrices[service.id] || ''}
                  onChange={(e) => setFinalPrices({
                    ...finalPrices,
                    [service.id]: e.target.value
                  })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                  size="small"
                />
              </Box>
            );
          })}
          
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="subtitle1">
              Valor Total: R$ {
                Object.values(finalPrices)
                  .reduce((sum, price) => sum + (Number(price) || 0), 0)
                  .toFixed(2)
              }
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseCompleteDialog} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveCompletedAppointment} 
            variant="contained" 
            color="success"
            sx={{ borderRadius: 16 }}
          >
            Finalizar Agendamento
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
            Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita e também removerá a transação financeira associada, se existir.
          </DialogContentText>
          {currentAppointment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Agendamento de {new Date(currentAppointment.start_time).toLocaleString('pt-BR')}
              </Typography>
              <Typography variant="body2">
                Cliente: {clients.find(c => c.id === currentAppointment.client_id)?.name || 'Desconhecido'}
              </Typography>
              <Typography variant="body2">
                Status: {currentAppointment.status}
              </Typography>
              <Typography variant="body2">
                Serviços: {currentAppointment.appointment_services.map(as => 
                  as.services?.name || services.find(s => s.id === as.service_id)?.name
                ).join(', ')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteAppointment} 
            color="error" 
            variant="contained" 
            autoFocus
            disabled={loading}
          >
            {loading ? 'Excluindo...' : 'Excluir'}
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