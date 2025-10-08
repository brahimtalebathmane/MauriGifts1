@@ .. @@
 -- Insert default payment methods with proper enum mapping
 INSERT INTO payment_methods (name, logo_url, status) VALUES
   ('بنكيلي', 'https://i.postimg.cc/0ywf19DB/1200x630wa.png', 'active'),
   ('السداد', 'https://i.postimg.cc/t4Whm2H0/OIP.webp', 'active'),
   ('مصرفي', 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png', 'active'),
   ('بيم بنك', 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp', 'active'),
   ('أمانتي', 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg', 'active'),
-  ('كليك', 'https://i.postimg.cc/5NwBssVh/unnamed.png', 'active');
+  ('كليك', 'https://i.postimg.cc/5NwBssVh/unnamed.png', 'active');
+
+-- Add comment to clarify payment method enum mapping
+COMMENT ON TABLE payment_methods IS 'Payment methods table. Names map to enum values: بنكيلي->bankily, السداد->sidad, مصرفي->masrvi, بيم بنك->bimbank, أمانتي->amanati, كليك->klik';