-- Category presets belong to a household. Keeping the earlier user-scoped
-- unique indexes prevents one user from using the same preset in two
-- different households.
drop index if exists categories_user_preset_idx;
drop index if exists deleted_category_presets_user_preset_idx;
