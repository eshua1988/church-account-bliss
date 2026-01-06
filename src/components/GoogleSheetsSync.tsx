import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Upload, Download } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Transaction, CURRENCY_SYMBOLS } from '@/types/transaction';

const SPREADSHEET_ID = '1WFFz7EV2ZUor-sQhvkZj3EHoTLRiEYjuxrTwLB96QKI';
const SHEET_RANGE = 'Sheet1!A:G';

interface GoogleSheetsSyncProps {
  transactions: Transaction[];
  getCategoryName: (id: string) => string;
  onImport?: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
}

export const GoogleSheetsSync = ({ transactions, getCategoryName, onImport }: GoogleSheetsSyncProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Prepare data for export
      const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Description', 'ID'];
      const rows = transactions.map(tx => [
        new Date(tx.date).toLocaleDateString(),
        tx.type,
        getCategoryName(tx.category),
        tx.amount.toString(),
        tx.currency,
        tx.description || '',
        tx.id,
      ]);

      const values = [headers, ...rows];

      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'write',
          spreadsheetId: SPREADSHEET_ID,
          range: SHEET_RANGE,
          values,
        },
      });

      if (error) throw error;

      toast({
        title: 'Экспорт завершен',
        description: `Экспортировано ${transactions.length} транзакций`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Ошибка экспорта',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          action: 'read',
          spreadsheetId: SPREADSHEET_ID,
          range: SHEET_RANGE,
        },
      });

      if (error) throw error;

      toast({
        title: 'Импорт завершен',
        description: `Получено ${data?.values?.length || 0} строк`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Ошибка импорта',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-lg">Google Sheets</h4>
      <p className="text-sm text-muted-foreground">
        Синхронизация данных с Google Таблицей
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Экспорт в таблицу
        </Button>
        <Button
          variant="outline"
          onClick={handleImport}
          disabled={isImporting}
        >
          {isImporting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Импорт из таблицы
        </Button>
      </div>
    </div>
  );
};
