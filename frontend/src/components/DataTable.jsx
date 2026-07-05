export default function DataTable({ columns, data, loading, emptyMessage = 'Aucune donnée' }) {
  if (loading) {
    return <div className="text-center py-8 text-gray-500">Chargement...</div>;
  }

  if (!data?.length) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 font-medium text-gray-600">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} className="border-b hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
