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

## 🚀 Getting Started

### 📥 Clone Repository
```bash
git clone https://github.com/your-username/midtrans-payment-gateway.git
cd midtrans-payment-gateway

## Folder Structure 
- Lib folder structure:
```
src/
├── app.controller.ts         # Controller utama aplikasi
├── app.module.ts             # Root module aplikasi
├── payment/
│   ├── payment.controller.ts # Controller untuk pembayaran
│   ├── payment.service.ts    # Service untuk logika pembayaran
│   ├── payment.module.ts     # Module untuk fitur pembayaran
├── test/                     # File testing aplikasi

```
