import { useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptApi, deliveryApi, transferApi, adjustmentApi } from '../api';

type DocType = 'receipts' | 'deliveries' | 'transfers' | 'adjustments';

const apiMap = {
  receipts:    receiptApi,
  deliveries:  deliveryApi,
  transfers:   transferApi,
  adjustments: adjustmentApi,
};

export function useDocumentActions(docType: DocType) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [docType] });

  const confirm = useMutation({
    mutationFn: (id: string) => apiMap[docType].confirm(id),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => apiMap[docType].cancel(id),
    onSuccess: invalidate,
  });

  return { confirm, cancel };
}
