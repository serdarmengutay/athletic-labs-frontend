# Athletic Labs Frontend

Modern sporcu performans takip sistemi - QR kod tabanlı test yönetimi ve real-time takip.

## 🏃‍♂️ Özellikler

### Test Yönetimi

- **Kulüp ve Sporcu Yönetimi** - Excel/CSV ile toplu sporcu import
- **QR Kod Sistemi** - Gerçek kamera ile QR kod tarama
- **Test İstasyonları** - 5 farklı test istasyonu (FFMI, Sprint, Çeviklik, vb.)
- **Antrenör Paneli** - İstasyon bazlı değer girişi
- **Real-time Dashboard** - Canlı test takibi

### Teknik Özellikler

- **Next.js 15** - Modern React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Responsive tasarım
- **QR Code Scanner** - Gerçek kamera entegrasyonu
- **JWT Authentication** - Güvenli Antrenör girişi
- **Mobile-First** - Tablet ve telefon uyumlu

## 🚀 Kurulum

```bash
# Repository'yi klonlayın
git clone https://github.com/serdarmengutay/athletic-labs-frontend.git

# Dependencies'leri yükleyin
npm install

# Development server'ı başlatın
npm run dev
```

## 📱 Kullanım

### 1. Test Öncesi Hazırlık

- Kulüp seçin
- Sporcu listesini Excel/CSV ile import edin
- QR kodları oluşturun ve yazdırın
- Antrenörları istasyonlara atayın

### 2. Saha Uygulaması

- Antrenörlar `/login` ile giriş yapar
- İstasyon sayfasında QR kodları tarar
- Test değerlerini girer
- Otomatik sıra takibi

### 3. Dashboard

- Real-time test durumu
- Sporcu ilerlemesi
- İstasyon istatistikleri

## 🔧 API Endpoints

### Authentication

- `POST /auth/coach/login` - Antrenör girişi
- `GET /auth/coach/profile` - Antrenör profili

### QR Management

- `POST /qr/validate` - QR kod doğrulama
- `POST /qr/bulk-generate` - Toplu QR oluşturma

### Station Management

- `POST /station/test` - Test değeri gönderme
- `GET /station/queue` - İstasyon sırası

## 🎯 Test İstasyonları

1. **FFMI & Boy-Kilo** - Vücut kompozisyonu
2. **30m Fotosel** - Sprint testi (2 koşu)
3. **Çeviklik Drilli** - Koordinasyon testi
4. **Dikey Sıçrama** - Güç testi
5. **Esneklik Boxı** - Hareketlilik testi

## 📊 Demo Hesaplar

- **FFMI İstasyonu:** ffmi@demo.com / demo123
- **Sprint İstasyonu:** sprint@demo.com / demo123
- **Yönetici:** admin@demo.com / admin123

## 🛠️ Teknoloji Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS
- **QR Scanner:** @yudiel/react-qr-scanner
- **HTTP Client:** Axios
- **Icons:** Lucide React

## 📱 Mobil Uyumluluk

- Responsive tasarım
- Touch-friendly arayüz
- Kamera entegrasyonu
- Offline çalışma desteği

## 🔗 Backend

Backend API için: [athletic-labs-backend](https://github.com/serdarmengutay/athletic-labs-backend)

## 📄 Lisans

MIT License
