# First Test Registration Flow

## Amac

Ilk kez test yapilacak bir kulupte, kulup yetkilisinden temiz ve eksiksiz Excel listesi beklemeden sporcu kayitlarini saglikli toplamak, KVKK/onay surecini veli/sporcu kaynagina yaklastirmak ve test gunu sonradan katilan sporculari operasyonu bozmadan sisteme dahil etmek.

Bu flow yalnizca ilk test veya daha once Athletic Labs kimlik sistemi oturmamis kulup senaryolari icindir. Tekrar test yapilacak kulup flow'u ayri dokuman olarak tasarlanacaktir.

## Temel Fikir

Kulup yetkilisi veri toplamak zorunda kalmaz. Kulup yetkilisinin gorevi, Athletic Labs tarafindan uretilen kayit linkini veli/sporcu grubuna iletmektir.

```text
Kulup linki paylasir.
Veli/sporcu kendi kaydini olusturur.
Kayit olan sporcular test listesine otomatik duser.
Kayit olmayan veya son dakika gelen sporcular sahada QR/link ile hizli kayit edilir.
Test sonu her sporcuya Athletic Labs ID verilir.
```

## Ana Roller

### Athletic Labs Operasyon Ekibi

- Test oturumunu olusturur.
- Kulup icin kayit linki/QR uretir.
- Kayit durumunu panelden izler.
- Test gunu eksik veya son dakika kayitlari yonetir.

### Kulup Yetkilisi / Antrenor

- Kayit linkini veli/sporcu grubuna iletir.
- Katilim konusunda velileri yonlendirir.
- Gerekirse test gunu sporcularin siralanmasina yardim eder.

Kulup yetkilisinden ideal olarak liste istenebilir, ancak bu flow'un calismasi icin temiz Excel zorunlu degildir.

### Veli / Sporcu

- Linke girerek on kayit olusturur.
- Temel kimlik ve iletisim bilgilerini girer.
- KVKK/onay adimlarini tamamlar.
- Test sonu Athletic Labs ID ile paneline erisir.

## On Kayit Linki

Her test oturumu icin tekil bir kayit linki uretilir.

Ornek:

```text
https://app.athleticlabs.com/register/gencsaray-2026-06-24
```

Bu link:

- kulup veli/sporcu WhatsApp grubuna atilabilir,
- e-posta ile paylasilabilir,
- QR olarak poster/cikti haline getirilebilir,
- test gunu sahada hizli kayit icin kullanilabilir.

## Veli/Sporcu On Kayit Formu

Form kisa tutulmalidir. Ilk hedef, sporcuyu test listesine temiz kimlikle almaktir.

### Zorunlu Alanlar

```text
Sporcu Ad Soyad
Dogum Tarihi
Cinsiyet
Veli Telefonu
KVKK/onay kutulari
```

### Opsiyonel Alanlar

```text
Pozisyon
Boy
Kilo
E-posta
Not
```

Opsiyonel alanlar test operasyonunu yavaslatmamalidir.

## Kayit Sonrasi Durumlar

Her sporcu kaydi bir kimlik durumu tasir.

```text
registered
  On kayit tamamlandi, test listesine dustu.

contact_verified
  Telefon dogrulamasi tamamlandi.

identity_complete
  Ad soyad, dogum tarihi, cinsiyet ve gerekli onaylar tamam.

identity_incomplete
  Minimum bilgi var, ancak dogrulama veya bazi alanlar eksik.

duplicate_candidate
  Sistem bu sporcunun daha once test edilmis olabilecegini dusunuyor.

temporary_profile
  Operasyon geregi hizli acildi, sonra merkez/admin incelemesi gerekiyor.
```

## Ilk Test Hazirlik Akisi

1. Athletic Labs panelinde test oturumu acilir.
2. Kulup, brans, tarih, sehir ve sorumlu bilgisi girilir.
3. Sistem test kayit linki ve QR uretir.
4. Kulup yetkilisine hazir mesaj gonderilir.
5. Kulup yetkilisi linki veli/sporcu grubuna iletir.
6. Veli/sporcu on kayit formunu doldurur.
7. Kayitlar panelde canli gorunur.
8. Test gunu kayitli sporcular hazir liste olarak acilir.

## Kulube Gonderilecek Ornek Mesaj

```text
Hocam merhaba, test gunu hizli ilerleyebilmemiz ve sporcularin sonuclarini kendi Athletic Labs panelinde gorebilmesi icin asagidaki on kayit linkini veli/sporcu grubuna iletmeniz yeterli.

Teste katilacak sporcular bu linkten 1 dakika icinde kayit olusturabilir.
Kayit olan sporcular test listemize otomatik duser.
Kayit olmayan sporcular test gunu sahada QR ile de eklenebilir.

Kayit linki:
{registration_link}
```

## Operasyon Panelinde Gosterilecek Metrikler

Testten once Athletic Labs ekibi su metrikleri gormelidir:

```text
Toplam on kayit sayisi
Telefon dogrulamasi tamamlanan sayi
Eksik kimlikli sporcu sayisi
Supheli duplicate aday sayisi
Cinsiyet/dogum tarihi eksik sayisi
Veli onayi eksik sayisi
```

Bu sayede test gunu kac sporcunun hazir, kacinin eksik oldugu onceden bilinir.

## Saha QR Hizli Kayit Masasi

### QR'dan Kastedilen Nedir?

Buradaki QR, belirli test oturumuna ait on kayit/hizli kayit linkinin QR kodudur.

Ornek link:

```text
https://app.athleticlabs.com/register/gencsaray-2026-06-24
```

Bu link QR'a cevrilir ve test alaninda gorunur bir yere koyulur:

- giris masasi,
- olcum alani,
- antrenor masasinin yani,
- tablet ekrani,
- basili poster,
- yaka karti veya masa karti.

### Kim Neyi Okutur?

1. Athletic Labs ekibi veya kulup yetkilisi, test oturumuna ait QR kodu gorunur sekilde koyar.
2. Veli veya sporcu kendi telefonuyla bu QR kodu okutur.
3. QR, veli/sporcu telefonunda kayit formunu acar.
4. Veli/sporcu bilgileri doldurur.
5. Kayit tamamlaninca sporcu test listesine otomatik duser.
6. Saha ekibi tabletinde yeni sporcuyu gorur ve teste alir.

Yani sporcuya ait bir QR okutulmuyor. Test oturumuna ait genel kayit QR'i okutuluyor.

### Telefonu Olmayan veya Zamani Olmayan Sporcu

Eger veli/sporcu telefon kullanamiyorsa:

1. Saha ekibi tabletinden "Hizli Kayit" acar.
2. Minimum bilgiler girilir:

```text
Ad Soyad
Dogum Yili veya Dogum Tarihi
Cinsiyet
```

3. Sporcu `identity_incomplete` veya `temporary_profile` durumunda test listesine eklenir.
4. Test yapilir.
5. Eksik bilgiler testten sonra veli linki veya kulup eksik bilgi listesi ile tamamlanir.

## Test Gunu Akisi

### Kayitli Sporcu Geldi

1. Sporcu listeden bulunur.
2. Durum `identity_complete` veya `registered` ise test akisi baslar.
3. Eksik bilgi varsa ekip QR/link ile tamamlatir veya test sonrasi tamamlanmak uzere isaretler.

### Kayitsiz Sporcu Geldi

1. Sporcu/veli sahadaki QR'i okutur.
2. On kayit formunu doldurur.
3. Sistem sporcuyu aktif test listesine ekler.
4. Saha ekibi tabletten sporcuyu gorur.
5. Test baslar.

### Son Dakika ve Acele Kayit

Zaman yoksa veya veli yoksa:

1. Operasyon ekibi minimum bilgiyle hizli kayit acabilir.
2. Sporcu `temporary_profile` olarak isaretlenir.
3. Test yapilir.
4. Rapor/panel erisimi eksik bilgi tamamlanana kadar sinirli kalir.

## Duplicate Kontrolu

On kayit veya saha hizli kayit sirasinda sistem arka planda mevcut sporcularla eslesme arar.

Guclu aday varsa:

```text
Bu sporcu daha once Athletic Labs testine katilmis olabilir.
Mevcut profile baglamak icin telefon dogrulamasi ve dogum tarihi onayi gerekir.
```

Sistem yalnızca ad soyad veya dogum yili ile otomatik baglama yapmaz.

Belirsiz durumlarda:

- kayit tamamlanir,
- sporcu test listesine eklenir,
- profil `duplicate_candidate` durumuna alinir,
- merkez/admin sonra inceler.

## Test Sonu Athletic Labs ID Teslimi

Her yeni global sporcu icin test sonunda Athletic Labs ID uretilir.

Bu ID:

- sporcu/veli panelinde gosterilir,
- SMS/WhatsApp/e-posta ile iletilebilir,
- rapor veya dijital sonuc ekraninda yer alir,
- sonraki testlerde kulube verilecek ana kimlik olur.

Ornek:

```text
AL-KZC-8F42
```

Test sonu mesaj ornegi:

```text
Athletic Labs sonuc paneliniz hazirlandiginda bu kimlik ile giris yapabilirsiniz:

Sporcu Kimligi: AL-KZC-8F42

Bu kimligi sonraki testlerde gelisim gecmisinizin devam etmesi icin saklayin.
```

## Riskler ve Onlemler

### Veli Kayit Yapmaz

Onlem:

- saha QR hizli kayit,
- operator acil kayit,
- test sonrasi eksik bilgi tamamlama linki.

### Veli Yanlis Bilgi Girer

Onlem:

- telefon dogrulamasi,
- dogum tarihi onayi,
- duplicate aday kontrolu,
- merkez admin incelemesi.

### Ayni Sporcu Iki Kez Kayit Olur

Onlem:

- ad soyad + dogum tarihi + telefon ile duplicate uyarisi,
- test gunu panelde supheli kayit rozeti,
- sonradan merge/unlink audit.

### Test Gunu Kayit Kuyrugu Olusur

Onlem:

- on kayit linkini testten once gondermek,
- sahada ayri hizli kayit masasi,
- QR posterleri,
- minimum bilgiyle gecici kayit opsiyonu.

### Kulup Linki Paylasmaz

Onlem:

- Athletic Labs ekibi linki dogrudan kulup WhatsApp grubuna iletebilir,
- test gunu QR ile kayit yapilabilir,
- minimum liste alinabiliyorsa import yedek akisi kullanilir.

## Bu Flow'un Avantaji

- Kulup yetkilisinin Excel disiplini zorlanmaz.
- Veli/sporcu bilgiyi kendi kaynagindan girer.
- KVKK/onay sureci daha dogru noktaya tasinir.
- Son dakika katilimlar sistem disinda kalmaz.
- Ilk test sonunda kalici Athletic Labs ID olusur.
- Tekrar testlerde kimlik eslestirme problemi azalir.
