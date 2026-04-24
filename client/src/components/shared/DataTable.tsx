import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  exportFileName?: string;
  headerAction?: React.ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
  onRowClick?: (data: TData) => void;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  isLoading,
  exportFileName,
  headerAction,
  emptyMessage = "No results found.",
  emptyDescription = "Try adjusting your search criteria.",
  onRowClick,
  pageSize = 25
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize }
    }
  });

  const handleExport = () => {
    if (!data.length) return;
    
    // Prepare data for Excel
    const exportData = data.map((row: any) => {
      const entry: any = {};
      columns.forEach((col: any) => {
        if (col.header && typeof col.header === 'string') {
          // Fix: Handle accessorKey or accessorFn correctly
          let value = '';
          if (col.accessorKey) {
            value = row[col.accessorKey];
          } else if (col.accessorFn) {
            value = col.accessorFn(row);
          } else if (col.id) {
            value = row[col.id];
          }
          entry[col.header] = value;
        }
      });
      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${exportFileName || 'export'}.xlsx`);
  };

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-4 shrink-0">
        {searchKey && (
          <div className="relative w-full md:max-w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-[var(--card-border)] rounded-xl leading-5 bg-slate-50 text-[var(--page-text)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] sm:text-sm transition duration-150 ease-in-out font-medium"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        )}

        {exportFileName && (
          <button 
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        )}

        {headerAction}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-[var(--card-border)] tracking-wider sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <th 
                        key={header.id} 
                        className="px-4 py-4 font-medium whitespace-nowrap cursor-pointer hover:bg-slate-400/10 transition-colors duration-200"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center space-x-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="w-4 h-4 ml-1 flex-shrink-0">
                            {{
                              asc: <ChevronUp className="w-4 h-4" />,
                              desc: <ChevronDown className="w-4 h-4" />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((_, colIdx) => (
                      <td key={colIdx} className="px-4 py-4">
                        <div className="h-4 bg-slate-200 rounded w-full max-w-[150px]"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => onRowClick?.(row.original)}
                    className={`hover:bg-slate-400/10 transition-colors duration-200 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4 text-slate-600">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-4 rounded-full bg-slate-50 flex items-center justify-center">
                        <Search className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-base font-medium">{emptyMessage}</p>
                      <p className="text-sm">{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--card-border)] bg-slate-50 shrink-0">
          <div className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-900">{table.getState().pagination.pageIndex + 1}</span> of{' '}
            <span className="font-medium text-slate-900">{table.getPageCount() || 1}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded-md text-slate-500 hover:bg-[var(--card-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded-md text-slate-500 hover:bg-[var(--card-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
