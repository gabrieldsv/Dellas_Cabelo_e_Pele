/**
 * Utility functions for exporting data
 */

/**
 * Converts an array of objects to CSV format
 * @param data Array of objects to convert
 * @param delimiter Delimiter to use (default: semicolon)
 * @returns CSV string
 */
export const convertToCSV = (data: any[], delimiter: string = ';'): string => {
  if (!data || data.length === 0) return '';
  
  // Get headers
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  let csv = headers.join(delimiter) + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'object') {
        // Convert objects to JSON string and escape quotes
        return JSON.stringify(value).replace(/"/g, '""');
      } else {
        // Convert to string and escape quotes
        return String(value).replace(/"/g, '""');
      }
    });
    
    csv += row.join(delimiter) + '\n';
  });
  
  return csv;
};

/**
 * Formats a date for use in filenames (YYYYMMDD)
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDateForFilename = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Exports data as a CSV file
 * @param data Data to export
 * @param filename Filename without extension
 */
export const exportAsCSV = (data: any[], filename: string): void => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${formatDateForFilename(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports data as a JSON file
 * @param data Data to export
 * @param filename Filename without extension
 */
export const exportAsJSON = (data: any[], filename: string): void => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${formatDateForFilename(new Date())}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formats a date for display (DD/MM/YYYY)
 * @param dateString Date string to format
 * @returns Formatted date string
 */
export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};