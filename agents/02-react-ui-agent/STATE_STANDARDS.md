# 📌 KOVAN Frontend State ve Mimari Standartları Rehberi

Bu rehber, React UI Ajanı'nın kod yazarken uyması gereken teknik kuralları ve hazır kod kalıplarını içerir.

---

### 1. API İstekleri Kalıbı (Template)

API ile konuşan her bileşen bu standarda uymalıdır:

```jsx
import React, { useState, useEffect } from "react";
import { api, errorMessage, getAuth } from "../api/client";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ExampleFeature({ unitId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const auth = getAuth();
  const canWrite = auth?.permissions?.includes("EXAMPLE_WRITE");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        // api() otomatik olarak Bearer token ve 401 yenilemesini yönetir
        const result = await api("GET", `/units/${unitId}/details`);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(errorMessage(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (unitId) loadData();

    return () => {
      isMounted = false;
    };
  }, [unitId]);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      setError(null);
      await api("POST", "/example/action", payload);
      setSuccess("İşlem başarıyla gerçekleştirildi.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-neutral-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span>Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-2xl">
      {error && (
        <div className="alert alert-error mb-4 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {/* Bileşen Gövdesi */}
    </div>
  );
}
```

---

### 2. Kesinlikle Yasak Olanlar (DON'TS) ❌

* ❌ `localStorage.setItem("token", ...)` veya `sessionStorage` kullanımı (YASAK!).
* ❌ `fetch("https://kovanbe...", ...)` ile doğrudan adrese istek atmak (YASAK! Tüm istekler `api()` fonksiyonundan geçmelidir).
* ❌ Ekstra kütüphane import etmek (`axios`, `redux`, `mobx`, `formik` vb. YASAK!).
* ❌ `react-icons`, `font-awesome` vb. harici ikonlar (Sadece `lucide-react` serbest).

---

### 3. Yapılması Zorunlu Olanlar (DO'S) ✅

* ✅ Tüm asenkron işlemlerde `loading`, `error` durumlarını yönetmek.
* ✅ İzin kontrollerini `auth?.permissions?.includes(...)` ile yapmak.
* ✅ Hata mesajlarını `errorMessage(err)` yardımcı fonksiyonu ile yakalamak.
* ✅ KOVAN tasarım sisteminin renk (`#CDA65B`), font (`Outfit`) ve kart stillerini kullanmak.
