@@ .. @@
-- Insert default payment methods safely (no ENUM conflicts)
INSERT INTO payment_methods (name, logo_url, status)
VALUES
  ('bankily', 'https://i.postimg.cc/0ywf19DB/1200x630wa.png', 'active'),
  ('sidad', 'https://i.postimg.cc/t4Whm2H0/OIP.webp', 'active'),
  ('masrvi', 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png', 'active'),
  ('bimbank', 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp', 'active'),
  ('amanati', 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg', 'active'),
  ('klik', 'https://i.postimg.cc/5NwBssVh/unnamed.png', 'active');
+
+-- Add comment to clarify payment method enum mapping
+COMMENT ON TABLE payment_methods IS 'Payment methods table. Names map to enum values: بنكيلي->bankily, السداد->sidad, مصرفي->masrvi, بيم بنك->bimbank, أمانتي->amanati, كليك->klik';