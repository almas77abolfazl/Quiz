# پلتفرم کوییز

بازی کوییز رقابتی فارسی با وب‌اپ بازی، پنل مدیریت و API مشترک.

## ساختار

- `apps/game`: بازی وب و مبنای خروجی Capacitor (پورت 4200)
- `apps/admin`: پنل مدیریت (پورت 4201)
- `apps/api`: API و realtime (پورت 3000)
- `packages/contracts`: قراردادهای مشترک
- `docs/product`: تصمیم‌ها و قوانین محصول

جزئیات محصول در [docs/product](docs/product/README.md) نگه‌داری می‌شود.

---

## راه اندازی محیط توسعه (Local Development)

### پیش‌نیازها
- **Node.js**: نسخه `^22.22.3 || ^24.15.0 || ^26.0.0` (پشتیبانی از Angular 22 و Node v22+)
- **pnpm**: نسخه `11.21.0` (نصب با `npm i -g pnpm`)
- **Docker Desktop**: جهت اجرا پایگاه‌داده PostgreSQL

### مراحل راه‌اندازی

1. **نصب وابستگی‌ها**:
   ```bash
   pnpm install
   ```

2. **ایجاد فایل تنظیمات محیطی (`.env`)**:
   - در ویندوز (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
   - در لینوکس / مک:
     ```bash
     cp .env.example .env
     ```

3. **اجرای دیتابیس PostgreSQL با داکر**:
   ```bash
   pnpm db:up
   ```
   برای بررسی وضعیت دیتابیس و سلامت آن:
   ```bash
   pnpm db:status
   ```

4. **تولید کلاینت Prisma**:
   ```bash
   pnpm prisma:generate
   ```

5. **اعمال مایگریشن‌های دیتابیس (Database Migrations)**:
   مایگریشن‌های Prisma اکنون منبع واحد حقیقت (Source of Truth) برای اسکیمای پایگاه‌داده هستند. دستور `prisma db push` دیگر روش اصلی راه‌اندازی نیست.
   - برای اعمال مایگریشن‌ها بر روی دیتابیس:
     ```bash
     pnpm prisma:migrate:deploy
     ```
   - برای توسعه و تغییر اسکیما در محیط محلی:
     ```bash
     pnpm prisma:migrate:dev
     ```
   - برای بررسی وضعیت مایگریشن‌ها:
     ```bash
     pnpm prisma:migrate:status
     ```
   *(توجه: فاز داده‌های اولیه/Seed در فاز بعدی اضافه خواهد شد.)*

6. **اجرای پروژه‌ها**:
   اجرای تمام سرویس‌ها به صورت هم‌زمان:
   ```bash
   pnpm dev
   ```
   یا اجرای تکی:
   - API: `pnpm dev:api`
   - Game: `pnpm dev:game`
   - Admin: `pnpm dev:admin`

### آدرس‌های برنامه‌ها

| سرویس | URL |
| :--- | :--- |
| **Game Application** | [http://localhost:4200](http://localhost:4200) |
| **Admin Panel** | [http://localhost:4201](http://localhost:4201) |
| **API Server** | [http://localhost:3000/api](http://localhost:3000/api) |

### خاموش کردن پایگاه داده

برای متوقف کردن کانتینر PostgreSQL:
```bash
pnpm db:down
```
*نکته: با این دستور Volume نام‌گذاری شده `postgres_data` حذف نمی‌شود و داده‌های شما باقی خواهند ماند.*
