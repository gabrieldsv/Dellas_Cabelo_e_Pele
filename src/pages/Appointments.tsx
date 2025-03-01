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
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  DateRange as DateRangeIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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
  parseISO,
  addDays,
  addWeeks,
  getDay,
  format,
  differenceInWeeks,
  setDay,
} from 'date-fns';

// Interfaces
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
    services?: { name: string };
  }[];
  created_by: string;
  recurrence?: string; // Exemplo: "weekly-tue,thu-8"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  const [openDialog, setOpenDialog] = useState(false);
  const [openClientDialog, setOpenClientDialog] = useState(false);
  const [openServiceDialog, setOpenServiceDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [deleteScope, setDeleteScope] = useState<'single' | 'all'>('single'); // Novo estado para escopo de exclusão

  const [clientId, setClientId] = useState('');
  const [appointmentServices, setAppointmentServices] = useState<string[]>([]);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(new Date());
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('0');
  const [finalPrices, setFinalPrices] = useState<{[key: string]: string}>({});
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState('4');

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appointmentsData, clientsData, servicesData] = await Promise.all([
        supabase.from('appointments').select('*, appointment_services(id, service_id, price, final_price, services(name))').order('start_time', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('services').select('*')
      ]);

      if (appointmentsData.error) throw appointmentsData.error;
      if (clientsData.error) throw clientsData.error;
      if (servicesData.error) throw servicesData.error;

      const sortedClients = (clientsData.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setAppointments(appointmentsData.data || []);
      setFilteredAppointments(appointmentsData.data || []);
      setClients(sortedClients);
      setFilteredClients(sortedClients);
      setServices(servicesData.data || []);
      setFilteredServices(servicesData.data || []);
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleFilter = () => {
    let filtered = [...appointments];
    if (startDate && endDate) {
      filtered = filtered.filter(appointment => {
        try {
          const appointmentDate = parseISO(appointment.start_time);
          const isInRange = isWithinInterval(appointmentDate, { start: startDate, end: endDate });

          if (!isInRange && appointment.recurrence) {
            const [type, days, weeks] = appointment.recurrence.split('-');
            if (type === 'weekly') {
              const recurrenceDays = days.split(',');
              const numWeeks = parseInt(weeks) || 4;
              const baseDate = parseISO(appointment.start_time);
              const diffWeeks = differenceInWeeks(endDate, baseDate);

              if (diffWeeks >= 0 && diffWeeks <= numWeeks) {
                const dayOfWeekMap = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 };
                return recurrenceDays.some(day => {
                  const baseDay = dayOfWeekMap[day as keyof typeof dayOfWeekMap];
                  const startDay = getDay(startDate);
                  const endDay = getDay(endDate);
                  return baseDay >= startDay && baseDay <= endDay;
                });
              }
            }
          }

          return isInRange;
        } catch (error) {
          console.error('Erro ao filtrar por data:', error);
          return false;
        }
      });
    }
    if (searchTerm) {
      filtered = filtered.filter(appointment => {
        const client = clients.find(c => c.id === appointment.client_id);
        const serviceNames = appointment.appointment_services.map(as => as.services?.name || services.find(s => s.id === as.service_id)?.name || '').join(', ');
        return (
          client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client?.phone && client.phone.includes(searchTerm)) ||
          serviceNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (appointment.recurrence?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
    }
    setFilteredAppointments(filtered);
  };

  useEffect(() => {
    handleFilter();
  }, [searchTerm, appointments, clients, services, startDate, endDate]);

  const handleFilterClients = () => {
    let filtered = [...clients];
    if (clientSearchTerm) {
      const searchTermLower = clientSearchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(searchTermLower) ||
        (client.phone && client.phone.toLowerCase().includes(searchTermLower))
      );
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    setFilteredClients(filtered);
  };

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

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setCurrentAppointment(appointment);
      setClientId(appointment.client_id);
      setAppointmentServices(appointment.appointment_services.map(as => as.service_id));
      setAppointmentDate(new Date(appointment.start_time));
      if (appointment.recurrence) {
        const [type, days, weeks] = appointment.recurrence.split('-');
        setRecurrenceType(type);
        setRecurrenceDays(days.split(','));
        setRecurrenceWeeks(weeks);
      } else {
        setRecurrenceType('none');
        setRecurrenceDays([]);
        setRecurrenceWeeks('4');
      }
    } else {
      setCurrentAppointment(null);
      setClientId('');
      setAppointmentServices([]);
      setAppointmentDate(new Date());
      setRecurrenceType('none');
      setRecurrenceDays([]);
      setRecurrenceWeeks('4');
    }
    setOpenDialog(true);
    setClientSearchTerm('');
    handleFilterClients();
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

  const handleSaveAppointment = async () => {
    if (!clientId || appointmentServices.length === 0 || !appointmentDate) {
      setError('Todos os campos são obrigatórios');
      return;
    }
    try {
      const totalDurationMinutes = appointmentServices.length * 30;
      const startDate = new Date(appointmentDate);
      const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60000);
      const recurrenceString = recurrenceType === 'weekly' && recurrenceDays.length > 0 
        ? `weekly-${recurrenceDays.join(',')}-${recurrenceWeeks}` 
        : null;

      if (currentAppointment) {
        // Atualizar todos os agendamentos recorrentes relacionados
        if (currentAppointment.recurrence) {
          const relatedAppointments = appointments.filter(a => a.recurrence === currentAppointment.recurrence);
          
          // Excluir serviços antigos e agendamentos relacionados
          for (const appt of relatedAppointments) {
            await supabase.from('appointment_services').delete().eq('appointment_id', appt.id);
            await supabase.from('appointments').delete().eq('id', appt.id);
          }

          // Recriar agendamentos com os novos dados
          const numWeeks = parseInt(recurrenceWeeks) || 4;
          const daysOfWeekMap = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 };
          
          // Criar um agendamento para cada dia selecionado em cada semana
          for (const day of recurrenceDays) {
            const dayNumber = daysOfWeekMap[day as keyof typeof daysOfWeekMap];
            
            // Calcular a data do primeiro agendamento para este dia da semana
            // Ajustamos a data base para o dia da semana selecionado
            const firstDate = new Date(startDate);
            const currentDay = getDay(firstDate);
            const daysToAdd = (dayNumber - currentDay + 7) % 7;
            
            // Criar agendamentos para cada semana
            for (let week = 0; week < numWeeks; week++) {
              // Calcular a data para esta semana
              const appointmentDate = addWeeks(
                daysToAdd === 0 ? firstDate : addDays(firstDate, daysToAdd), 
                week
              );
              
              const appointmentEndDate = new Date(appointmentDate.getTime() + totalDurationMinutes * 60000);
              
              // Criar o agendamento
              const { data, error } = await supabase
                .from('appointments')
                .insert([{ 
                  client_id: clientId, 
                  start_time: appointmentDate.toISOString(), 
                  end_time: appointmentEndDate.toISOString(), 
                  status: 'scheduled', 
                  created_by: user?.id,
                  recurrence: recurrenceString 
                }])
                .select('id')
                .single();
              
              if (error) throw error;

              // Adicionar serviços ao agendamento
              const servicesToInsert = appointmentServices.map(serviceId => ({
                appointment_id: data.id,
                service_id: serviceId,
                price: services.find(s => s.id === serviceId)?.price || 0,
                final_price: 0
              }));
              
              await supabase.from('appointment_services').insert(servicesToInsert);
            }
          }
        } else {
          // Atualizar apenas o agendamento atual (não recorrente)
          const { data, error } = await supabase
            .from('appointments')
            .update({ 
              client_id: clientId, 
              start_time: startDate.toISOString(), 
              end_time: endDate.toISOString(),
              recurrence: recurrenceString 
            })
            .eq('id', currentAppointment.id)
            .select('id')
            .single();
          if (error) throw error;

          await supabase.from('appointment_services').delete().eq('appointment_id', data.id);
          const servicesToInsert = appointmentServices.map(serviceId => ({
            appointment_id: data.id,
            service_id: serviceId,
            price: services.find(s => s.id === serviceId)?.price || 0,
            final_price: 0
          }));
          await supabase.from('appointment_services').insert(servicesToInsert);
        }
      } else {
        // Novo agendamento
        if (recurrenceType === 'weekly' && recurrenceDays.length > 0) {
          // Criar agendamentos recorrentes
          const numWeeks = parseInt(recurrenceWeeks) || 4;
          const daysOfWeekMap = { 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6, 'sun': 0 };
          
          // Criar um agendamento para cada dia selecionado em cada semana
          for (const day of recurrenceDays) {
            const dayNumber = daysOfWeekMap[day as keyof typeof daysOfWeekMap];
            
            // Calcular a data do primeiro agendamento para este dia da semana
            // Ajustamos a data base para o dia da semana selecionado
            const firstDate = new Date(startDate);
            const currentDay = getDay(firstDate);
            const daysToAdd = (dayNumber - currentDay + 7) % 7;
            
            // Criar agendamentos para cada semana
            for (let week = 0; week < numWeeks; week++) {
              // Calcular a data para esta semana
              const appointmentDate = addWeeks(
                daysToAdd === 0 ? firstDate : addDays(firstDate, daysToAdd), 
                week
              );
              
              const appointmentEndDate = new Date(appointmentDate.getTime() + totalDurationMinutes * 60000);
              
              // Criar o agendamento
              const { data, error } = await supabase
                .from('appointments')
                .insert([{ 
                  client_id: clientId, 
                  start_time: appointmentDate.toISOString(), 
                  end_time: appointmentEndDate.toISOString(), 
                  status: 'scheduled', 
                  created_by: user?.id,
                  recurrence: recurrenceString 
                }])
                .select('id')
                .single();
              
              if (error) throw error;

              // Adicionar serviços ao agendamento
              const servicesToInsert = appointmentServices.map(serviceId => ({
                appointment_id: data.id,
                service_id: serviceId,
                price: services.find(s => s.id === serviceId)?.price || 0,
                final_price: 0
              }));
              
              await supabase.from('appointment_services').insert(servicesToInsert);
            }
          }
        } else {
          // Agendamento único (não recorrente)
          const { data, error } = await supabase
            .from('appointments')
            .insert([{ 
              client_id: clientId, 
              start_time: startDate.toISOString(), 
              end_time: endDate.toISOString(), 
              status: 'scheduled', 
              created_by: user?.id,
              recurrence: recurrenceString 
            }])
            .select('id')
            .single();
          if (error) throw error;

          const appointmentId = data.id;
          const servicesToInsert = appointmentServices.map(serviceId => ({
            appointment_id: appointmentId,
            service_id: serviceId,
            price: services.find(s => s.id === serviceId)?.price || 0,
            final_price: 0
          }));
          await supabase.from('appointment_services').insert(servicesToInsert);
        }
      }

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
        .insert([{ name: newClientName, phone: newClientPhone || null, created_by: user?.id }])
        .select('id, name, phone')
        .single();
      if (error) throw error;

      const updatedClients = [...clients, data].sort((a, b) => a.name.localeCompare(b.name));
      setClients(updatedClients);
      setFilteredClients(updatedClients);
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
      if (currentAppointment.recurrence && deleteScope === 'all') {
        // Excluir todos os agendamentos relacionados
        const relatedAppointments = appointments.filter(a => a.recurrence === currentAppointment.recurrence);
        for (const appt of relatedAppointments) {
          await supabase.from('appointment_services').delete().eq('appointment_id', appt.id);
          await supabase.from('appointments').delete().eq('id', appt.id);
        }
      } else {
        // Excluir apenas o agendamento atual
        await supabase.from('appointment_services').delete().eq('appointment_id', currentAppointment.id);
        await supabase.from('appointments').delete().eq('id', currentAppointment.id);
      }

      setSuccess(`Agendamento${deleteScope === 'all' ? 's recorrentes' : ''} excluído${deleteScope === 'all' ? 's' : ''} com sucesso!`);
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
      case 'scheduled': return <Chip label="Agendado" color="primary" size="small" />;
      case 'completed': return <Chip label="Concluído" color="success" size="small" />;
      case 'cancelled': return <Chip label="Cancelado" color="error" size="small" />;
      default: return <Chip label={status} size="small" />;
    }
  };

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

  const getDayOfWeek = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'EEEE', { locale: ptBR });
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'medium' }}>Agendamentos</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' }, borderRadius: 2 }}
        >
          Novo Agendamento
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          variant="outlined"
          placeholder="Buscar por nome, telefone, serviço, status ou recorrência..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 1 }}>
                <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.25rem' }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
          sx={{ borderRadius: 2 }}
        >
          Atualizar
        </Button>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Serviços</TableCell>
              <TableCell>Dia da Semana</TableCell>
              <TableCell>Data e Hora</TableCell>
              <TableCell>Recorrência</TableCell>
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
                  <TableCell>{appointment.appointment_services.map(as => as.services?.name || services.find(s => s.id === as.service_id)?.name || '').join(', ')}</TableCell>
                  <TableCell>{getDayOfWeek(appointment.start_time)}</TableCell>
                  <TableCell>{new Date(appointment.start_time).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    {appointment.recurrence ? (
                      <Chip 
                        label={`Recorrente: ${appointment.recurrence.split('-')[1].replace(/,/g, ', ')} (${appointment.recurrence.split('-')[2]} semanas)`}
                        icon={<RepeatIcon />}
                        size="small"
                        color="info"
                      />
                    ) : 'Único'}
                  </TableCell>
                  <TableCell>{getStatusChip(appointment.status)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {appointment.status === 'scheduled' && (
                        <>
                          <IconButton color="success" onClick={() => handleCompleteAppointment(appointment)} size="small" sx={{ mr: 1 }}>
                            <CheckCircleIcon />
                          </IconButton>
                          <IconButton color="error" onClick={() => handleCancelAppointment(appointment.id)} size="small" sx={{ mr: 1 }}>
                            <CancelIcon />
                          </IconButton>
                        </>
                      )}
                      <IconButton color="primary" onClick={() => handleOpenDialog(appointment)} size="small" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleOpenDeleteDialog(appointment)} size="small">
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

      {/* Modal de Agendamento */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar cliente..."
              value={clientSearchTerm}
              onChange={(e) => {
                setClientSearchTerm(e.target.value);
                handleFilterClients();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={clientId}
                onChange={(e) => setClientId(e.target.value as string)}
                label="Cliente"
                sx={{ borderRadius: 2 }}
              >
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      <Box>
                        <Typography variant="body1">{client.name}</Typography>
                        {client.phone && (
                          <Typography variant="caption" color="text.secondary">{formatPhoneDisplay(client.phone)}</Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Nenhum cliente encontrado</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar serviço..."
              value={serviceSearchTerm}
              onChange={(e) => {
                setServiceSearchTerm(e.target.value);
                handleFilterServices();
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
            <FormControl fullWidth>
              <InputLabel>Serviços</InputLabel>
              <Select
                multiple
                value={appointmentServices}
                onChange={(e) => setAppointmentServices(e.target.value as string[])}
                renderValue={(selected) => selected.map(id => services.find(s => s.id === id)?.name).join(', ')}
                label="Serviços"
                sx={{ borderRadius: 2 }}
              >
                {filteredServices.map(service => (
                  <MenuItem key={service.id} value={service.id}>
                    <Checkbox checked={appointmentServices.includes(service.id)} />
                    <ListItemText primary={service.name} secondary={`R$ ${service.price.toFixed(2)}`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <DateTimePicker
              label="Data e Hora"
              value={appointmentDate}
              onChange={(newValue) => setAppointmentDate(newValue)}
              slotProps={{ textField: { fullWidth: true, sx: { mt: 2, borderRadius: 2 } } }}
            />
          </LocalizationProvider>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Recorrência</InputLabel>
              <Select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value)}
                label="Tipo de Recorrência"
              >
                <MenuItem value="none">Nenhuma</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
              </Select>
            </FormControl>
            {recurrenceType === 'weekly' && (
              <>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Dias da Semana</InputLabel>
                  <Select
                    multiple
                    value={recurrenceDays}
                    onChange={(e) => setRecurrenceDays(e.target.value as string[])}
                    renderValue={(selected) => selected.map(day => day === 'mon' ? 'Seg' : day === 'tue' ? 'Ter' : day === 'wed' ? 'Qua' : day === 'thu' ? 'Qui' : day === 'fri' ? 'Sex' : day === 'sat' ? 'Sáb' : 'Dom').join(', ')}
                    label="Dias da Semana"
                  >
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                      <MenuItem key={day} value={day}>
                        <Checkbox checked={recurrenceDays.includes(day)} />
                        <ListItemText primary={day === 'mon' ? 'Segunda' : day === 'tue' ? 'Terça' : day === 'wed' ? 'Quarta' : day === 'thu' ? 'Quinta' : day === 'fri' ? 'Sexta' : day === 'sat' ? 'Sábado' : 'Domingo'} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Número de Semanas"
                  type="number"
                  value={recurrenceWeeks}
                  onChange={(e) => setRecurrenceWeeks(e.target.value)}
                  inputProps={{ min: 1 }}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => setOpenClientDialog(true)} 
              variant="contained" 
              sx={{ backgroundColor: '#c8e6c9', '&:hover': { backgroundColor: '#a5d6a7' }, borderRadius: 2 }}
            >
              Adicionar Novo Cliente
            </Button>
            <Button 
              onClick={() => setOpenServiceDialog(true)} 
              variant="contained" 
              sx={{ backgroundColor: '#b3e5fc', '&:hover': { backgroundColor: '#90caf9' }, borderRadius: 2 }}
            >
              Adicionar Novo Serviço
            </Button>
            <Button 
              onClick={handleSaveAppointment} 
              variant="contained" 
              sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' }, borderRadius: 2 }}
            >
              Salvar
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Modal Novo Cliente */}
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
            sx={{ mb: 2, borderRadius: 2 }}
          />
          <TextField
            margin="dense"
            label="Telefone"
            fullWidth
            value={newClientPhone}
            onChange={handlePhoneChange}
            placeholder="(00) 0 0000-0000"
            sx={{ borderRadius: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseClientDialog} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button 
            onClick={handleSaveNewClient} 
            variant="contained" 
            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' }, borderRadius: 2 }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Novo Serviço */}
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
            sx={{ mb: 2, borderRadius: 2 }}
          />
          <TextField
            margin="dense"
            label="Preço"
            type="number"
            fullWidth
            value={newServicePrice}
            onChange={(e) => setNewServicePrice(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            sx={{ borderRadius: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseServiceDialog} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button 
            onClick={handleSaveNewService} 
            variant="contained" 
            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' }, borderRadius: 2 }}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Finalizar Agendamento */}
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
                sx={{ borderRadius: 2 }}
              />
            </Box>
          ))}
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="subtitle1">
              Valor Total: R$ {Object.values(finalPrices).reduce((sum, price) => sum + (Number(price) || 0), 0).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseCompleteDialog} sx={{ color: 'text.secondary' }}>Cancelar</Button>
          <Button 
            onClick={handleSaveCompletedAppointment} 
            variant="contained" 
            color="success" 
            sx={{ borderRadius: 2 }}
          >
            Finalizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Excluir Agendamento */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {currentAppointment?.recurrence 
              ? 'Deseja excluir apenas este agendamento ou todos os agendamentos recorrentes relacionados?'
              : 'Tem certeza que deseja excluir este agendamento?'}
          </DialogContentText>
          {currentAppointment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography>Cliente: {clients.find(c => c.id === currentAppointment.client_id)?.name || 'Desconhecido'}</Typography>
              <Typography>Data: {new Date(currentAppointment.start_time).toLocaleString('pt-BR')}</Typography>
              {currentAppointment.recurrence && (
                <Typography>Recorrência: {currentAppointment.recurrence.split('-')[1].replace(/,/g, ', ')} ({currentAppointment.recurrence.split('-')[2]} semanas)</Typography>
              )}
            </Box>
          )}
          {currentAppointment?.recurrence && (
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <RadioGroup
                value={deleteScope}
                onChange={(e) => setDeleteScope(e.target.value as 'single' | 'all')}
              >
                <FormControlLabel value="single" control={<Radio />} label="Apenas este agendamento" />
                <FormControlLabel value="all" control={<Radio />} label="Todos os agendamentos recorrentes" />
              </RadioGroup>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteAppointment} color="error" variant="contained" disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
}
