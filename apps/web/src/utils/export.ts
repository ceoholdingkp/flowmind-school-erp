/**
 * Exporta un array de objetos a CSV descargable (compatible con Excel vía BOM UTF-8).
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[],
): void {
  if (!data.length) {
    alert('No hay datos para exportar.');
    return;
  }

  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k, label: k }));
  const headers = cols.map((c) => c.label).join(';');

  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape: si contiene ; o " → envolver en comillas
        return str.includes(';') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(';'),
  );

  const csv = '\uFEFF' + [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Descarga un endpoint del backend como archivo (para exportaciones Excel generadas en servidor).
 */
export function downloadFromAPI(url: string, filename: string): void {
  const token = localStorage.getItem('accessToken');
  const fullUrl = `/api/v1${url}`;

  fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error('Error al exportar');
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => alert('Error al generar la exportación. Intente nuevamente.'));
}

/**
 * Abre el diálogo de impresión del navegador (para exportar PDF).
 */
export function printAsPDF(): void {
  window.print();
}
