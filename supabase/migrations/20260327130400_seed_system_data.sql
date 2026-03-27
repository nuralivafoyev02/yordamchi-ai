insert into public.categories (
  name,
  slug,
  translation_key,
  kind,
  icon,
  color_token,
  sort_order,
  is_system
)
values
  ('General', 'general', 'categories.general', 'general', 'grid', 'accent-slate', 1, true),
  ('Salary', 'salary', 'categories.salary', 'income', 'wallet', 'accent-green', 2, true),
  ('Bonus', 'bonus', 'categories.bonus', 'income', 'sparkles', 'accent-green', 3, true),
  ('Gift', 'gift', 'categories.gift', 'income', 'gift', 'accent-green', 4, true),
  ('Food', 'food', 'categories.food', 'expense', 'utensils', 'accent-orange', 10, true),
  ('Transport', 'transport', 'categories.transport', 'expense', 'car', 'accent-blue', 11, true),
  ('Utilities', 'utilities', 'categories.utilities', 'expense', 'bolt', 'accent-yellow', 12, true),
  ('Health', 'health', 'categories.health', 'expense', 'heart-pulse', 'accent-red', 13, true),
  ('Education', 'education', 'categories.education', 'expense', 'graduation-cap', 'accent-indigo', 14, true),
  ('Tax', 'tax', 'categories.tax', 'expense', 'receipt', 'accent-red', 15, true),
  ('Shopping', 'shopping', 'categories.shopping', 'expense', 'shopping-bag', 'accent-pink', 16, true),
  ('Entertainment', 'entertainment', 'categories.entertainment', 'expense', 'film', 'accent-purple', 17, true)
on conflict do nothing;

insert into public.exchange_rates (
  base_currency,
  quote_currency,
  rate,
  rate_date,
  source
)
values
  ('USD', 'UZS', 12650.000000, current_date, 'seed'),
  ('UZS', 'USD', 0.000079, current_date, 'seed')
on conflict do nothing;
