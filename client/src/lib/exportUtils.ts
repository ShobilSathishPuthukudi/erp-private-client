/**
 * Institutional Data Export Utility
 * 
 * Provides client-side CSV generation for ERP dashboard modules.
 */

export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // Flatten nested objects and extract headers
  const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object' || data[0][key] === null);
  
  // Custom headers mapping if needed could go here, but for now we use keys
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        let val = row[header] === null || row[header] === undefined ? '' : row[header];
        // Escape commas and quotes for CSV safety
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
