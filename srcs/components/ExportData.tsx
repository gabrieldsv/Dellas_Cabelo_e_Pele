import { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  FileDownload as FileDownloadIcon,
  Description as CsvIcon,
  Code as JsonIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { exportAsCSV, exportAsJSON } from '../utils/exportUtils';

interface ExportDataProps {
  open: boolean;
  onClose: () => void;
}

type ExportType = 'clients' | 'services' | 'appointments' | 'inventory' | 'sales' | 'financial';
type FileFormat = 'csv' | 'json';

export default function ExportData({ open, onClose }: ExportDataProps) {
  const [exportType, setExportType] = useState<ExportType>('clients');
  const [fileFormat, setFileFormat] = useState<FileFormat>('csv');
  const [includeAll, setIncludeAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleExportTypeChange = (event: SelectChangeEvent) => {
    setExportType(event.target.value as ExportType);
  };

  const handleFileFormatChange = (_event: React.MouseEvent<HTMLElement>, newFormat: FileFormat | null) => {
    if (newFormat !== null) {
      setFileFormat(newFormat);
    }
  };

  const handleIncludeAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeAll(event.target.checked);
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    
    try {
      let data;
      let fileName = '';
      
      // Fetch data based on export type
      switch (exportType) {
        case 'clients':
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('*')
            .order('name', { ascending: true });
          
          if (clientsError) throw clientsError;
          data = clientsData;
          fileName = 'clientes';
          break;
          
        case 'services':
          const { data: servicesData, error: servicesError } = await supabase
            .from('services')
            .select('*')
            .order('name', { ascending: true });
          
          if (servicesError) throw servicesError;
          data = servicesData;
          fileName = 'servicos';
          break;
          
        case 'appointments':
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
              *,
              clients (name),
              appointment_services (
                id,
                service_id,
                price,
                final_price,
                services (name)
              )
            `)
            .order('start_time', { ascending: false });
          
          if (appointmentsError) throw appointmentsError;
          
          // Format appointments data for export
          data = appointmentsData.map(appointment => ({
            id: appointment.id,
            client: appointment.clients?.name,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            status: appointment.status,
            final_price: appointment.final_price,
            services: appointment.appointment_services.map((as: any) => as.services?.name).join(', '),
            notes: appointment.notes
          }));
          
          fileName = 'agendamentos';
          break;
          
        case 'inventory':
          const { data: inventoryData, error: inventoryError } = await supabase
            .from('inventory')
            .select('*')
            .order('name', { ascending: true });
          
          if (inventoryError) throw inventoryError;
          data = inventoryData;
          fileName = 'estoque';
          break;
          
        case 'sales':
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select(`
              *,
              client:client_id (name),
              sale_items (
                id,
                inventory_id,
                quantity,
                unit_price,
                total_price,
                inventory (name)
              )
            `)
            .order('sale_date', { ascending: false });
          
          if (salesError) throw salesError;
          
          // Format sales data for export
          data = salesData.map(sale => ({
            id: sale.id,
            sale_date: sale.sale_date,
            client: sale.client?.name || 'Não informado',
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            items: sale.sale_items.map((item: any) => 
              `${item.quantity}x ${item.inventory?.name} (R$ ${item.unit_price})`
            ).join('; '),
            notes: sale.notes
          }));
          
          fileName = 'vendas';
          break;
          
        case 'financial':
          const { data: financialData, error: financialError } = await supabase
            .from('financial_transactions')
            .select('*')
            .order('transaction_date', { ascending: false });
          
          if (financialError) throw financialError;
          data = financialData;
          fileName = 'financeiro';
          break;
          
        default:
          throw new Error('Tipo de exportação inválido');
      }
      
      // Filter data if not including all
      if (!includeAll) {
        // For appointments and sales, only include recent data (last 30 days)
        if (exportType === 'appointments' || exportType === 'sales' || exportType === 'financial') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          data = data.filter((item: any) => {
            const itemDate = new Date(item.start_time || item.sale_date || item.transaction_date);
            return itemDate >= thirtyDaysAgo;
          });
        }
      }
      
      // Export data based on selected format
      if (fileFormat === 'csv') {
        exportAsCSV(data, fileName);
      } else {
        exportAsJSON(data, fileName);
      }
      
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      setError('Falha ao exportar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Exportar Dados</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selecione o tipo de dados que deseja exportar e o formato do arquivo.
            </Typography>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="export-type-label">Tipo de Dados</InputLabel>
            <Select
              labelId="export-type-label"
              value={exportType}
              label="Tipo de Dados"
              onChange={handleExportTypeChange}
            >
              <MenuItem value="clients">Clientes</MenuItem>
              <MenuItem value="services">Serviços</MenuItem>
              <MenuItem value="appointments">Agendamentos</MenuItem>
              <MenuItem value="inventory">Estoque</MenuItem>
              <MenuItem value="sales">Vendas</MenuItem>
              <MenuItem value="financial">Transações Financeiras</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Formato do Arquivo
            </Typography>
            <ToggleButtonGroup
              value={fileFormat}
              exclusive
              onChange={handleFileFormatChange}
              aria-label="file format"
              sx={{ width: '100%' }}
            >
              <ToggleButton value="csv" aria-label="CSV" sx={{ flex: 1 }}>
                <CsvIcon sx={{ mr: 1 }} /> CSV
              </ToggleButton>
              <ToggleButton value="json" aria-label="JSON" sx={{ flex: 1 }}>
                <JsonIcon sx={{ mr: 1 }} /> JSON
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeAll}
                  onChange={handleIncludeAllChange}
                  name="includeAll"
                  color="primary"
                />
              }
              label="Incluir todos os registros (desmarcado: apenas últimos 30 dias)"
            />
          </Box>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Detalhes da Exportação:
            </Typography>
            
            {exportType === 'clients' && (
              <Typography variant="body2">
                Exportará todos os clientes cadastrados com nome, telefone e data de criação.
              </Typography>
            )}
            
            {exportType === 'services' && (
              <Typography variant="body2">
                Exportará todos os serviços cadastrados com nome e preço.
              </Typography>
            )}
            
            {exportType === 'appointments' && (
              <Typography variant="body2">
                Exportará {includeAll ? 'todos os' : 'os últimos 30 dias de'} agendamentos com cliente, data, serviços e status.
              </Typography>
            )}
            
            {exportType === 'inventory' && (
              <Typography variant="body2">
                Exportará todos os itens do estoque com nome, quantidade, preço de custo e preço de venda.
              </Typography>
            )}
            
            {exportType === 'sales' && (
              <Typography variant="body2">
                Exportará {includeAll ? 'todas as' : 'as últimas 30 dias de'} vendas com data, valor total, forma de pagamento e itens vendidos.
              </Typography>
            )}
            
            {exportType === 'financial' && (
              <Typography variant="body2">
                Exportará {includeAll ? 'todas as' : 'as últimas 30 dias de'} transações financeiras com data, descrição, valor, tipo e categoria.
              </Typography>
            )}
            
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              Formato: {fileFormat.toUpperCase()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            variant="contained" 
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <FileDownloadIcon />}
            disabled={loading}
          >
            {loading ? 'Exportando...' : 'Exportar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Dados exportados com sucesso!
        </Alert>
      </Snackbar>
    </>
  );
}