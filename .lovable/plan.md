

## ترتيب نتائج البحث حسب المخزون + فلتر البضاعة

### المشكلة
حالياً نتائج البحث مرتبة حسب تطابق الاسم/الكود فقط، بدون مراعاة إذا المنتج فيه ستوك أو لا. المنتجات اللي ما فيها ستوك بتطلع بنفس المرتبة مع اللي فيها.

### الحل

#### 1. تحديث دالة البحث في قاعدة البيانات
تعديل `search_products` لإضافة ترتيب ثانوي حسب المخزون:
- المنتجات اللي فيها ستوك (mevcut_stok > 0) تطلع أولاً
- المنتجات اللي ما فيها ستوك تطلع بعدها

الترتيب النهائي:
1. تطابق كامل على الكود/الباركود
2. بداية الاسم بالكلمة
3. يحتوي الكلمة
4. **ضمن كل مجموعة**: الموجود بالستوك أولاً
5. ثم أبجدياً

#### 2. إضافة فلتر في نتائج البحث (SearchPalette)
إضافة شريط فلتر بسيط فوق النتائج بثلاث خيارات:
- **الكل** (افتراضي)
- **متوفر** (فقط المنتجات اللي فيها ستوك)
- **غير متوفر** (فقط المنتجات اللي ما فيها ستوك)

مع إظهار نقطة ملونة (خضراء/حمراء) بجانب كل منتج في النتائج لتوضيح حالة المخزون.

### التفاصيل التقنية

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.search_products(query text)
RETURNS SETOF public.products
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT * FROM public.products
  WHERE is_deleted = false
    AND search_text ILIKE '%' || lower(public.immutable_unaccent(query)) || '%'
  ORDER BY
    CASE
      WHEN lower(urun_kodu) = lower(query) THEN 0
      WHEN lower(barkod) = lower(query) THEN 0
      WHEN lower(public.immutable_unaccent(urun_adi)) ILIKE lower(public.immutable_unaccent(query)) || '%' THEN 1
      WHEN lower(urun_kodu) ILIKE lower(query) || '%' THEN 1
      ELSE 2
    END,
    CASE WHEN mevcut_stok > 0 THEN 0 ELSE 1 END,
    urun_adi
  LIMIT 80;
$$;
```

**SearchPalette.tsx:**
- إضافة state للفلتر: `stockFilter: 'all' | 'in_stock' | 'out_of_stock'`
- شريط فلتر بأزرار صغيرة (chips) فوق النتائج
- تصفية `productResults` حسب الفلتر المختار
- إضافة نقطة ملونة بجانب كل منتج (خضراء = متوفر، حمراء = غير متوفر)

**globalSearch.ts:**
- تمرير قيمة `stock` الموجودة أصلاً في `SearchResultProduct` (لا تغيير مطلوب)

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Database migration | تحديث `search_products` بترتيب المخزون |
| `src/components/layout/SearchPalette.tsx` | إضافة فلتر + نقطة حالة المخزون |

