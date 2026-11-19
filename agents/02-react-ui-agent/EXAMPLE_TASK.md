# 🧪 React UI Ajanı Örnek Çalışma Simülasyonu (Example Run)

Bu doküman, React UI Ajanı'nın verilen bir UseCase ve API spesifikasyonunu KOVAN standartlarında bir bileşene nasıl dönüştürdüğünü gösterir.

---

### 1. Ajan'a Verilen Girdi (Input Task)

```json
{
  "useCase": "Aidat Borcu Manuel Tahsilat Ekranı",
  "endpoint": {
    "method": "POST",
    "path": "/payments/collect-cash",
    "body": {
      "debtId": "uuid",
      "amount": "number",
      "paymentDate": "ISO8601 string",
      "notes": "string"
    }
  },
  "requiredPermission": "PAYMENT_WRITE",
  "screenRequirements": {
    "title": "Elden / Havale ile Aidat Tahsilatı",
    "inputs": [
      { "name": "amount", "label": "Tahsil Edilen Tutar (TL)", "type": "number", "required": true },
      { "name": "paymentDate", "label": "Ödeme Tarihi", "type": "date", "required": true },
      { "name": "notes", "label": "Açıklama / Makbuz No", "type": "text", "required": false }
    ],
    "actionButton": "Tahsilatı Kaydet"
  }
}
```

---

### 2. Ajanın Ürettiği Çıktı (Generated Component Output)

```jsx
import React, { useState } from "react";
import { api, errorMessage, getAuth } from "../api/client";
import { DollarSign, Calendar, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function CashCollectionModal({ debtId, totalDebt, residentName, onClose, onSuccess }) {
  const [amount, setAmount] = useState(totalDebt || "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // KOVAN İzin Kontrolü
  const auth = getAuth();
  const canCollect = auth?.permissions?.includes("PAYMENT_WRITE");

  if (!canCollect) {
    return (
      <div className="glass-panel p-6 text-center text-rose-500">
        <AlertCircle className="mx-auto mb-2" size={32} />
        <p>Bu işlemi gerçekleştirmek için tahsilat yetkiniz (PAYMENT_WRITE) bulunmamaktadır.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Lütfen geçerli bir tutar giriniz.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // KOVAN Standart API Çağrısı (In-Memory Token otomatik eklenir)
      await api("POST", "/payments/collect-cash", {
        debtId,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 max-w-md w-full rounded-2xl border border-amber-500/20 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
          <DollarSign className="text-amber-400" size={20} />
          <span>Elden / Havale ile Tahsilat</span>
        </h3>
      </div>

      {residentName && (
        <div className="mt-4 p-3 bg-neutral-900/60 rounded-xl text-xs text-neutral-300">
          Sakin: <strong className="text-amber-400">{residentName}</strong>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1">
            Tahsil Edilen Tutar (TL) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:border-amber-400 focus:outline-none text-sm"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1">
            Ödeme Tarihi *
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:border-amber-400 focus:outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1">
            Açıklama / Makbuz No
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:border-amber-400 focus:outline-none text-sm"
            placeholder="Örn: 2026/104 No'lu Makbuz"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Vazgeç
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Tahsilatı Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
```
