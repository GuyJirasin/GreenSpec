alter table public.implementation_entries add constraint implementation_quantity_finite check(quantity::text not in ('NaN','Infinity','-Infinity'));
alter table public.procurements add constraint procurement_quantity_finite check(ordered_qty is null or ordered_qty::text not in ('NaN','Infinity','-Infinity'));
alter table public.actual_results add constraint actual_value_finite check(total_value is null or total_value::text not in ('NaN','Infinity','-Infinity'));
