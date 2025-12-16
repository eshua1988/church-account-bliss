import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencySelector } from '@/components/CurrencySelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';
import { Currency, Transaction } from '@/types/transaction';
import { Category } from '@/hooks/useCategories';
import { FileText, Share2 } from 'lucide-react';

interface PayoutDialogProps {
  expenseCategories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export const PayoutDialog = ({ expenseCategories, onAddTransaction }: PayoutDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('PLN');
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id || '');
  const [issuedTo, setIssuedTo] = useState('');
  const [decisionNumber, setDecisionNumber] = useState('');
  const [amountInWords, setAmountInWords] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const buildTransaction = () : Omit<Transaction, 'id' | 'createdAt'> => ({
    type: 'expense',
    amount: parseFloat(amount),
    currency,
    category: categoryId as any,
    description,
    date: new Date(date),
    issuedTo: issuedTo || undefined,
    decisionNumber: decisionNumber || undefined,
    amountInWords: amountInWords || undefined,
    cashierName: cashierName || undefined,
  });

  const generatePdfBlob = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const doc = new jsPDF();
    const lines = [] as string[];
    lines.push(t('payoutDialogTitle'));
    lines.push('');
    lines.push(`${t('amount')}: ${tx.amount} ${tx.currency}`);
    lines.push(`${t('date')}: ${tx.date.toISOString().split('T')[0]}`);
    lines.push(`${t('issuedTo')}: ${tx.issuedTo || t('unknown')}`);
    lines.push(`${t('decisionNumber')}: ${tx.decisionNumber || t('unknown')}`);
    lines.push(`${t('cashierName')}: ${tx.cashierName || t('unknown')}`);
    lines.push('');
    lines.push(`${t('description')}: ${tx.description || t('unknown')}`);

    let y = 20;
    lines.forEach(line => {
      doc.text(line, 20, y);
      y += 8;
    });

    const blob = doc.output('blob');
    return blob;
  };

  const handleDownload = async () => {
    if (!amount || parseFloat(amount) <= 0 || !categoryId) return;
    const tx = buildTransaction();
    onAddTransaction(tx);
    const filename = `dowod-${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = await generatePdfBlob(tx);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
    toast({ title: t('expenseAdded'), description: t('payoutDownloaded') });
  };

  const handleShare = async () => {
    if (!amount || parseFloat(amount) <= 0 || !categoryId) return;
    const tx = buildTransaction();
    onAddTransaction(tx);
    const blob = await generatePdfBlob(tx);
    const filename = `dowod-${new Date().toISOString().split('T')[0]}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], title: t('payout'), text: t('payoutDialogTitle') });
        toast({ title: t('payoutShared') });
      } catch (e) {
        // user cancelled or error
        toast({ title: t('payoutShared'), description: t('unknown') });
      }
    } else {
      // Fallback: copy text summary to clipboard
      const summary = `${t('payoutDialogTitle')}\n${t('amount')}: ${tx.amount} ${tx.currency}\n${t('date')}: ${tx.date.toISOString().split('T')[0]}\n${t('issuedTo')}: ${tx.issuedTo || t('unknown')}`;
      try {
        await navigator.clipboard.writeText(summary);
        toast({ title: t('payoutShared'), description: t('payoutCopied') });
      } catch (e) {
        toast({ title: t('payoutShared'), description: t('unknown') });
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-semibold"><FileText className="w-4 h-4 mr-2" />{t('payout')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>{t('payoutDialogTitle')}</DialogTitle></DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p_amount">{t('amount')}</Label>
              <Input id="p_amount" type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <CurrencySelector value={currency} onChange={setCurrency} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p_issuedTo">{t('issuedTo')}</Label>
            <Input id="p_issuedTo" placeholder={t('enterIssuedTo')} value={issuedTo} onChange={e => setIssuedTo(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p_decisionNumber">{t('decisionNumber')}</Label>
              <Input id="p_decisionNumber" placeholder={t('enterDecisionNumber')} value={decisionNumber} onChange={e => setDecisionNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_cashierName">{t('cashierName')}</Label>
              <Input id="p_cashierName" placeholder={t('enterCashierName')} value={cashierName} onChange={e => setCashierName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p_amountInWords">{t('amountInWords')}</Label>
            <Input id="p_amountInWords" placeholder={t('enterAmountInWords')} value={amountInWords} onChange={e => setAmountInWords(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="p_description">{t('description')}</Label>
            <Textarea id="p_description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownload}><FileText className="w-4 h-4 mr-2" />{t('download')}</Button>
          <Button className="flex-1" onClick={handleShare}><Share2 className="w-4 h-4 mr-2" />{t('share')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutDialog;
