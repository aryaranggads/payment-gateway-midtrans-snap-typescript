# Midtrans Payment Gateway

Aplikasi **Charging Station** yang terintegrasi dengan **Midtrans Snap Payment Gateway**, dibangun menggunakan **NestJS**, **TypeScript**, dan **MySQL**.

---

## 📋 Overview

Proyek ini bertujuan untuk menyediakan backend untuk aplikasi pembayaran di charging station. Fitur-fitur utama meliputi:
- Integrasi dengan Midtrans Snap untuk proses pembayaran.
- RESTful API yang modular dan scalable.
- Notifikasi email setelah pembayaran sukses.
- Database MySQL untuk penyimpanan data transaksi.

---
## Folder Structure 
- Lib folder structure:
```
src/
├── app.controller.ts        
├── app.module.ts  
├── app.service.ts            
├── payment/
│   ├── payment.controller.ts 
│   ├── payment.service.ts    
│   ├── payment.module.ts     
├── test/                     

```

---  

## 🛠 Requirements  

Sebelum memulai, pastikan Anda telah memenuhi persyaratan berikut:  

1. **Node.js**  
   - Versi minimal **v16.x**.  
   - [Unduh Node.js di sini](https://nodejs.org).  

2. **MySQL**  
   - Database MySQL versi minimal **8.x**.  
   - [Unduh MySQL di sini](https://dev.mysql.com/downloads/).  

3. **Nest CLI**  
   - Instal CLI untuk pengelolaan proyek NestJS:  
   ```bash  
   npm install -g @nestjs/cli  


## 🚀 Getting Started

### 📥 Clone Repository
```bash
git clone https://github.com/your-username/midtrans-payment-gateway.git
cd midtrans-payment-gateway


