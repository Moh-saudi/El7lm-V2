#!/bin/bash

# دليل النشر على Hostinger VPS
echo "🚀 بدء النشر على Hostinger VPS..."

# 1. تحديث النظام
echo "📦 تحديث النظام..."
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js 18
echo "📦 تثبيت Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. تثبيت PM2
echo "📦 تثبيت PM2..."
sudo npm install -g pm2

# 4. تثبيت Nginx
echo "📦 تثبيت Nginx..."
sudo apt install nginx -y

# 5. استنساخ المشروع
echo "📦 استنساخ المشروع..."
git clone https://github.com/Moh-saudi/el7lm-backup.git
cd el7lm-backup

# 6. تثبيت التبعيات
echo "📦 تثبيت التبعيات..."
npm install

# 7. نسخ إعدادات VPS
echo "📦 نسخ إعدادات VPS..."
cp next.config.vps.js next.config.js

# 8. بناء المشروع
echo "📦 بناء المشروع..."
npm run build

# 9. تشغيل المشروع
echo "📦 تشغيل المشروع..."
pm2 start npm --name "el7lm" -- start
pm2 save
pm2 startup

# 10. إعداد Nginx
echo "📦 إعداد Nginx..."
sudo tee /etc/nginx/sites-available/el7lm << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 11. تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/el7lm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 12. تثبيت SSL
echo "📦 تثبيت SSL..."
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com

echo "✅ تم النشر بنجاح على Hostinger VPS!"
echo "🌐 الموقع متاح على: https://your-domain.com"
echo "📊 حالة المشروع: pm2 status"
echo "📝 سجلات المشروع: pm2 logs el7lm"
