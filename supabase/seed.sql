insert into public.categories (name, icon, description) values
  ('Rice', 'BowlFood', 'Comfort rice plates with signature sauces.'),
  ('Jollof Rice', 'Flame', 'Smoky party-style jollof.'),
  ('Fried Rice', 'Leaf', 'Vegetable fried rice with proteins.'),
  ('Native Rice', 'Soup', 'Palm oil rice with seafood notes.'),
  ('White Rice', 'Utensils', 'Steamed rice with stew options.'),
  ('Swallow', 'Wheat', 'Classic swallow meals with rich soups.'),
  ('Pounded Yam', 'Wheat', 'Smooth yam swallow.'),
  ('Eba', 'Wheat', 'Golden garri swallow.'),
  ('Amala', 'Wheat', 'Soft yam flour swallow.'),
  ('Semo', 'Wheat', 'Silky semolina swallow.'),
  ('Fufu', 'Wheat', 'Soft fermented cassava swallow.'),
  ('Soups', 'Soup', 'Deep, hearty Nigerian soups.'),
  ('Egusi', 'Soup', 'Melon seed soup.'),
  ('Ogbono', 'Soup', 'Draw soup with assorted meats.'),
  ('Afang', 'Leaf', 'Leafy seafood-rich soup.'),
  ('Vegetable Soup', 'Leaf', 'Fresh greens and proteins.'),
  ('Seafood Okra', 'Fish', 'Okra loaded with seafood.'),
  ('Pepper Soup', 'Flame', 'Spicy aromatic broth.'),
  ('Grills', 'Flame', 'Fire-kissed proteins and sides.'),
  ('Chicken', 'Drumstick', 'Grilled and fried chicken.'),
  ('Turkey', 'Drumstick', 'Smoked turkey portions.'),
  ('Goat Meat', 'Flame', 'Peppered goat meat.'),
  ('Fish', 'Fish', 'Whole fish and fillets.'),
  ('Suya', 'Flame', 'Spiced skewers.'),
  ('Shawarma', 'Sandwich', 'Creamy wraps with grilled fillings.'),
  ('Pizza', 'Pizza', 'Crisp crust pizzas.'),
  ('Small', 'Pizza', 'Personal pizzas.'),
  ('Medium', 'Pizza', 'Shareable medium pizzas.'),
  ('Large', 'Pizza', 'Family-size pizzas.'),
  ('Burgers', 'Sandwich', 'Stacked gourmet burgers.'),
  ('Drinks', 'CupSoda', 'Cold drinks and mocktails.'),
  ('Smoothies', 'CupSoda', 'Fresh fruit blends.'),
  ('Desserts', 'CakeSlice', 'Sweet finishes.')
on conflict (name) do update set
  icon = excluded.icon,
  description = excluded.description;

update public.categories child
set parent_id = parent.id
from public.categories parent
where
  (child.name, parent.name) in (
    ('Jollof Rice', 'Rice'),
    ('Fried Rice', 'Rice'),
    ('Native Rice', 'Rice'),
    ('White Rice', 'Rice'),
    ('Pounded Yam', 'Swallow'),
    ('Eba', 'Swallow'),
    ('Amala', 'Swallow'),
    ('Semo', 'Swallow'),
    ('Fufu', 'Swallow'),
    ('Egusi', 'Soups'),
    ('Ogbono', 'Soups'),
    ('Afang', 'Soups'),
    ('Vegetable Soup', 'Soups'),
    ('Seafood Okra', 'Soups'),
    ('Pepper Soup', 'Soups'),
    ('Chicken', 'Grills'),
    ('Turkey', 'Grills'),
    ('Goat Meat', 'Grills'),
    ('Fish', 'Grills'),
    ('Suya', 'Grills'),
    ('Small', 'Pizza'),
    ('Medium', 'Pizza'),
    ('Large', 'Pizza')
  );

with food_seed (slug, name, category_name, price, preparation_time, calories, rating, popularity, ingredients, is_special, is_recommended) as (
  values
    ('jollof-feast', 'Savoury Jollof Feast', 'Jollof Rice', 8500, 32, 690, 4.9, 188, array['smoky jollof','grilled chicken','plantain','pepper sauce'], true, true),
    ('fried-rice-chicken', 'Golden Fried Rice Chicken', 'Fried Rice', 7800, 27, 640, 4.8, 142, array['fried rice','chicken','coleslaw','chilli oil'], false, true),
    ('native-rice-fish', 'Native Rice and Croaker', 'Native Rice', 9200, 35, 720, 4.7, 98, array['palm rice','croaker','scent leaf','prawns'], true, false),
    ('white-rice-stew', 'White Rice and Beef Stew', 'White Rice', 6200, 20, 560, 4.6, 73, array['white rice','beef stew','plantain'], false, false),
    ('pounded-yam-egusi', 'Pounded Yam with Egusi', 'Pounded Yam', 8800, 30, 810, 4.9, 205, array['pounded yam','egusi','beef','stockfish'], true, true),
    ('eba-ogbono', 'Eba and Ogbono Bowl', 'Eba', 6500, 24, 700, 4.6, 64, array['eba','ogbono','assorted meat'], false, false),
    ('amala-vegetable', 'Amala Vegetable Deluxe', 'Amala', 7200, 25, 690, 4.7, 87, array['amala','vegetable soup','turkey'], false, true),
    ('semo-afang', 'Semo with Afang', 'Semo', 7900, 28, 760, 4.8, 112, array['semo','afang','periwinkle','beef'], true, false),
    ('fufu-seafood-okra', 'Fufu Seafood Okra', 'Fufu', 9800, 34, 820, 4.8, 129, array['fufu','okra','prawns','fish'], false, true),
    ('pepper-soup-goat', 'Goat Meat Pepper Soup', 'Pepper Soup', 7000, 22, 480, 4.7, 101, array['goat meat','pepper soup spice','yam'], false, false),
    ('grilled-chicken', 'Charcoal Grilled Chicken', 'Chicken', 7600, 26, 610, 4.8, 166, array['chicken','suya spice','herb rice'], true, true),
    ('smoked-turkey', 'Smoked Turkey Platter', 'Turkey', 8900, 30, 670, 4.7, 82, array['turkey','chips','slaw','pepper sauce'], false, false),
    ('goat-meat-asun', 'Peppered Goat Meat Asun', 'Goat Meat', 8300, 28, 590, 4.8, 139, array['goat meat','onions','scotch bonnet'], true, false),
    ('whole-fish', 'Grilled Whole Fish', 'Fish', 11000, 38, 740, 4.9, 91, array['tilapia','plantain','salad','sauce'], false, true),
    ('suya-box', 'Premium Suya Box', 'Suya', 6800, 18, 520, 4.7, 175, array['beef suya','yaji','onions','tomatoes'], false, true),
    ('chicken-shawarma', 'Loaded Chicken Shawarma', 'Shawarma', 5200, 15, 620, 4.6, 120, array['flatbread','chicken','sausages','garlic cream'], false, false),
    ('small-pizza', 'Small Pepperoni Pizza', 'Small', 6000, 18, 770, 4.5, 54, array['pepperoni','mozzarella','tomato sauce'], false, false),
    ('medium-pizza', 'Medium Chicken Suya Pizza', 'Medium', 10500, 24, 980, 4.8, 97, array['suya chicken','mozzarella','peppers'], true, true),
    ('large-pizza', 'Large Family Feast Pizza', 'Large', 14500, 30, 1300, 4.7, 88, array['beef','chicken','vegetables','cheese'], false, false),
    ('beef-burger', 'Savoury Double Burger', 'Burgers', 7400, 17, 850, 4.8, 149, array['beef patties','cheddar','pickles','signature sauce'], true, true),
    ('zobo-drink', 'Zobo Citrus Cooler', 'Drinks', 2400, 4, 130, 4.6, 62, array['hibiscus','ginger','orange','mint'], false, false),
    ('mango-smoothie', 'Mango Passion Smoothie', 'Smoothies', 3600, 6, 260, 4.8, 77, array['mango','passion fruit','yogurt'], false, true),
    ('chocolate-cake', 'Warm Chocolate Cake', 'Desserts', 4200, 10, 430, 4.7, 58, array['dark chocolate','cream','berries'], false, false)
)
insert into public.foods (
  slug, name, category_id, description, price, image_url, ingredients, calories,
  preparation_time, rating, popularity, is_available, is_special, is_recommended
)
select
  food_seed.slug,
  food_seed.name,
  categories.id,
  'Premium ' || food_seed.name || ' prepared fresh by Savoury''s kitchen with balanced seasoning and fast delivery packaging.',
  food_seed.price,
  '/images/savoury-hero.png',
  food_seed.ingredients,
  food_seed.calories,
  food_seed.preparation_time,
  food_seed.rating,
  food_seed.popularity,
  true,
  food_seed.is_special,
  food_seed.is_recommended
from food_seed
join public.categories on categories.name = food_seed.category_name
on conflict (slug) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  ingredients = excluded.ingredients,
  calories = excluded.calories,
  preparation_time = excluded.preparation_time,
  rating = excluded.rating,
  popularity = excluded.popularity,
  is_available = excluded.is_available,
  is_special = excluded.is_special,
  is_recommended = excluded.is_recommended;

insert into public.coupons (code, discount_type, value, min_order, is_active) values
  ('SAVOURY15', 'percentage', 15, 10000, true),
  ('FAST1000', 'fixed', 1000, 7000, true),
  ('WELCOME20', 'percentage', 20, 15000, true)
on conflict (code) do update set
  discount_type = excluded.discount_type,
  value = excluded.value,
  min_order = excluded.min_order,
  is_active = excluded.is_active;

insert into public.restaurant_settings (name, tagline, opening_hours, delivery_base_fee, tax_rate)
values ('Savoury', 'Fresh Meals Delivered Fast.', 'Open daily, 9:00 AM - 11:00 PM', 1200, 0.075)
on conflict do nothing;

select 'Seed complete' as status;
