# Athletic Labs Athlete Identity and Portal Architecture

## Amac

Athletic Labs'in karne odakli cikti modelinden cikarak, her sporcuyu yillar boyunca takip edebilen, kulup/franchise degisimlerinde kimligi koruyan ve saha, Youji Health, VALD verilerini tek sporcu profili altinda birlestiren kurumsal veri mimarisini tanimlar.

Bu dokumanin temel problemi sudur:

- Sporcu bir kez sisteme girdiginde kalici ve takip edilebilir olmali.
- Sporcu kulup, sehir, franchise veya test donemi degistirse bile ayni kisi oldugu guvenli sekilde bilinebilmeli.
- Yanlis profil eslestirmesine izin verilmemeli.
- Belirsiz durumlarda sistem otomatik karar vermemeli; aday eslesme uretmeli ve insan onayi istemeli.
- Sporcu/veli web paneline guvenli ama kullanimi kolay sekilde erisebilmeli.

## Ana Prensipler

1. Athletic Labs hicbir sporcuyu yalnizca ad soyad veya dogum yili ile otomatik eslestirmez.
2. Athletic Labs ID en guclu sistem ici kimliktir.
3. Athletic Labs ID yoksa telefon dogrulamasi ve dogum tarihi onayi ile hesap kurtarma/giris akisi calisir.
4. Belirsiz eslesmeler otomatik baglanmaz; import onayi veya merkez admin incelemesi ister.
5. Saha operasyonu hizli kalir; supheli kayitlar gerekirse gecici profil olarak acilir ve sonra incelenir.
6. Franchise/kulup yetkileri sinirlidir; baska kulubun hassas verileri otomatik gosterilmez.
7. Her olcumun veri kaynagi bellidir: saha, Youji Health, VALD, manuel, import, derived.
8. Merge, unlink ve manuel eslestirme islemleri audit log ile tutulur.

## Kavramsal Model

### Athlete

Kalici global sporcu kaydidir. Sporcu kulup degistirse, farkli franchise tarafindan test edilse veya yillar sonra tekrar sisteme girse bile degismemesi gereken ana kayittir.

Ornek:

```text
Athlete
  id: uuid
  athleticLabsId: AL-KZC-8F42
  fullName: Kuzey Cakar
  birthDate: 2012-04-18
  gender: male
```

### AthleteTest

Sporcunun belirli bir test oturumundaki katilimidir.

```text
Athlete
  Kuzey Cakar

AthleteTests
  Ucevler testi - 2024
  Gencsaray testi - 2026
```

Bu ayrim kritik:

```text
Athlete = gercek kisi
AthleteTest = bir test gunundeki katilim
Measurement = o testte veya cihaza bagli olcum
ClubMembership = kulup gecmisi
```

## Onerilen Veri Varliklari

```text
Athlete
  Global sporcu kaydi

AthleteIdentity
  Athletic Labs ID, ad soyad, dogum tarihi, cinsiyet, identity status

AthleteContact
  veli telefonu, veli e-posta, sporcu telefonu/e-posta
  hassas alanlar sifreli veya hash destekli tutulmali

Club
  kulup, franchise veya organizasyon

ClubMembership
  sporcunun kulup/franchise/organizasyon gecmisi

TestSession
  test gunu ve operasyon kaydi

AthleteTest
  sporcunun belirli test oturumundaki katilimi

MeasurementEvent
  olcum olayi ve veri kaynagi

FieldMeasurement
  saha ici testler

YoujiMeasurement
  Youji Health rapor ozeti ve cihaz rapor linki

ValdMeasurement
  VALD kaynakli normalize performans verileri

AthleteMatchCandidate
  import veya saha aramasinda uretilen aday eslesmeler

AthleteMergeAudit
  merge, unlink, manuel eslestirme gecmisi

AthletePortalAccess
  sporcu/veli web panel erisim kayitlari

ConsentRecord
  veli/sporcu onaylari, veri isleme izinleri, tekrar test/onay kayitlari
```

## Athletic Labs ID

Her yeni global sporcuya ilk testten sonra kalici bir Athletic Labs ID uretilir.

Ornek format:

```text
AL-KZC-8F42
```

ID'nin gorevleri:

- web panel girisi,
- sonraki testlerde kulup listesinden istenen birincil kimlik,
- rapor ve dijital profilde gorunen sporcu kodu,
- QR/dijital kart ile hizli tanima,
- franchise saha ekipleri icin guvenli arama,
- import eslestirmesinde en guclu anahtar.

ID kesinlikle kulube bagli olmamalidir. Kulup degisse bile ayni kalir.

## Sporcu/Veli Portal Girisi

### Normal Giris

Sporcu veya veli su bilgilerle giris yapar:

```text
Athletic Labs ID
Ad Soyad
```

Bu akis kullanimi kolay tutar ve test sonrasi verilen kimlik karti/QR ile dogrudan calisir.

### Athletic Labs ID Kaybedildiyse

Sporcu veya veli ID'yi kaybettiyse kurtarma akisi calisir:

```text
Telefon numarasi
SMS dogrulama kodu
Dogum tarihi onayi
```

Basarili dogrulamadan sonra:

- kullanici mevcut sporcu profiline baglanir,
- Athletic Labs ID tekrar gosterilir,
- gerekiyorsa yeni QR/dijital kimlik olusturulur.

### Hassas Veri Gosterimi

Basit giris ile temel profil ve son test ozeti acilabilir. Youji Health detaylari, tum gecmis, indirilebilir raporlar ve hassas performans verileri icin telefon dogrulamasi veya veli/sporcu hesabi dogrulamasi zorunlu hale getirilebilir.

Bu karar urun fazina gore ayarlanabilir; ancak uzun vadede hassas veri icin ikinci dogrulama tavsiye edilir.

## Excel ve Liste Import Akisi

### Ideal Template

Tekrar testlerde kulup/franchise tarafindan istenecek ideal liste:

```text
Athletic Labs ID | Ad Soyad | Dogum Tarihi | Cinsiyet | Pozisyon | Veli Telefonu
```

İlk testlerde Athletic Labs ID bos olabilir. Tekrar testlerde daha once test edilmis sporcular icin ID istenir.

### Minimum Kabul Edilebilir Template

Saha gercekligi nedeniyle kulup yetkililerinden her zaman ideal liste gelmeyebilir. Minimum kabul edilebilir liste:

```text
Ad Soyad | Dogum Tarihi
```

Dogum tarihi yeni sistemde gun/ay/yil olarak istenmelidir. Yalnizca dogum yili, eslestirme icin dusuk guven sinyali sayilmalidir.

### Import Karar Sirasi

1. Athletic Labs ID varsa:
   - ilgili `Athlete` aranir,
   - ad soyad/dogum tarihi tutarsizsa uyari uretilir,
   - guvenli eslesme olarak onaya sunulur.

2. Athletic Labs ID yoksa:
   - ad soyad, tam dogum tarihi, cinsiyet, telefon ve kulup gecmisiyle aday eslesmeler aranir,
   - sistem adaylari skorlar,
   - otomatik baglama yapmaz.

3. Aday yoksa:
   - yeni `Athlete` olusturulur,
   - Athletic Labs ID uretilir.

4. Supheli durum varsa:
   - gecici profil olusturulur,
   - merkez admin incelemesine duser.

## Eslesme Guven Seviyeleri

### Kesin Eslesme

Asagidaki durumlardan biri varsa kesin eslesme kabul edilebilir:

- Athletic Labs ID dogru ve profil bilgileri tutarli,
- QR/dijital kimlik okutulmus,
- telefon dogrulamasi ve dogum tarihi onayi basarili,
- dogrulanmis veli/sporcu hesabi profili onaylamis,
- VALD profile ID veya baska guvenilir external ID bagli.

### Guclu Aday

Otomatik baglanmamalidir, ancak kullaniciya onerilebilir:

- ad soyad cok benzer,
- tam dogum tarihi ayni,
- cinsiyet ayni,
- onceki kulup/sehir veya veli telefonunun maskelenmis/hashed eslesmesi destekliyor.

### Zayif Aday

Sadece inceleme icin gosterilmelidir:

- ad soyad benzer,
- dogum yili ayni,
- brans veya sehir benzer,
- fiziksel profil yakin.

### Otomatik Eslesmeye Yasak Sinyaller

Tek basina asagidakilerle eslestirme yapilmaz:

- sadece ad soyad,
- sadece dogum yili,
- sadece kulup,
- sadece sehir,
- sadece benzer boy/kilo,
- sahada "ben daha once girmistim" beyaninin tek basina kendisi.

## Saha Senaryosu: Kuzey Cakar

Senaryo:

- Kuzey Cakar 1.5 yil once Ucevler kulubunde test edildi.
- Gecen hafta Gencsaray testinde "hocam ben daha once teste girmistim" dedi.

Yeni sistemde akis:

1. Gencsaray listesi import edilir.
2. Kuzey Cakar satirinda Athletic Labs ID varsa direkt guvenli aday uretilir.
3. ID yoksa ad soyad + tam dogum tarihi + cinsiyet ile aday aranir.
4. Sistem onceki Ucevler kaydini aday olarak gosterir.
5. Saha kullanicisi veya merkez admin ek bilgiyle onaylar.
6. Yeni `AthleteTest`, mevcut `Athlete` altina baglanir.
7. Portalda artik 1.5 yillik gelisim gorunebilir.

Emin olunamazsa:

```text
Yeni gecici profil olustur.
Merkez admin sonra inceleyip baglasin veya ayri birakmaya karar versin.
```

## Franchise Yetki Modeli

Franchise/kulup sunlari yapabilir:

- kendi test oturumlarini olusturmak,
- kendi listelerini import etmek,
- kendi testindeki sporcularin olcumlerini girmek,
- kendi yetkili oldugu sporcularin sonuclarini gormek,
- aday eslesmeleri sinirli bilgiyle gormek.

Franchise/kulup sunlari yapmamalidir:

- Turkiye genelindeki tum sporcu verilerini serbestce aramak,
- baska kulubun detayli olcumlerini gormek,
- guclu kanit olmadan profilleri merge etmek,
- veli/sporcu onayi olmadan tum gecmis ve hassas veriye erismek.

Merkez admin sunlari yapabilir:

- duplicate adaylarini incelemek,
- profil merge/unlink yapmak,
- hatali baglantiyi ayirmak,
- veri erisim taleplerini ve onaylari yonetmek.

## Saglikli Liste Toplama Stratejisi

Kulup yetkililerinden bugun ad soyad ve dogum yilini bile zor almak operasyonel bir gercek. Bu nedenle veri kalitesini "tek seferde mukemmel liste" beklentisiyle degil, asamali ve kolaylastirilmis surecle artirmak gerekir.

### 1. Listeyi Kulube Degil, Velilere Dogrulatmak

Kulup sadece temel listeyi yukler:

```text
Ad Soyad | Dogum Tarihi veya Dogum Yili
```

Sistem her sporcu icin veliye doldurulabilir bir link/QR uretir. Veli eksik alanlari kendisi tamamlar:

- tam dogum tarihi,
- telefon,
- istege bagli e-posta,
- KVKK/onay,
- onceki Athletic Labs ID varsa giris.

Bu yontem kulup yetkilisinin is yukunu azaltir.

### 2. Saha Gunu QR ile Hali Hazirda Eksik Veri Tamamlama

Test alaninda sporcu karti veya tablet ekraninda "bilgiler eksik" uyarisi olur. Sporcu/veli QR okutup eksik alanlari tamamlar.

Eksik bilgi testin durmasina sebep olmaz; ancak profil `incomplete_identity` durumunda kalir.

### 3. Tekrar Test Kulup Paketi

Tekrar testten once kulube otomatik bir "tekrar test hazirlik paketi" gonderilir:

- onceki Athletic Labs ID'leri,
- sporcu adlari,
- dogum tarihleri maskeli veya kontrollu,
- "listeye bu ID'leri ekleyin" talimati,
- eksik veri sayisi,
- veli dogrulama linkleri.

Bu, kulubun sifirdan liste hazirlamasini engeller.

### 4. Excel Yerine Paylasilabilir Web Formu

Kulup yetkilisi Excel doldurmakta zorlanirsa tek link uzerinden sporcu ekler:

```text
Kulup test listesi formu
  + Sporcu ekle
  + Toplu yapistir
  + Excel yukle
  + Eksik bilgileri velilere gonder
```

Bu ekran, Excel'den daha az hata uretir.

### 5. Toplu Yapistirma Modu

Kulup genelde WhatsApp'tan veya PDF'ten liste atar. Bu nedenle sistem su formati kabul edebilmelidir:

```text
Kuzey Cakar 2012
Nisa Sakiz 2010
Ahmet Yilmaz 12.03.2011
```

Sistem bunlari parse eder, eksik alanlari isaretler ve import preview'e tasir.

### 6. Veri Kalitesi Skoru

Her test oturumuna veri kalitesi skoru verilir:

```text
Kimlik Tamlik Orani: %72
Athletic Labs ID Eslesme Orani: %48
Telefon Dogrulama Orani: %35
Tam Dogum Tarihi Orani: %81
Supheli Eslesme Sayisi: 4
```

Bu skor hem ic operasyonu hem franchise kalitesini olcer.

### 7. Kulup Icin Minimum Zorunluluk, Sistem Icin Kademeli Zenginlestirme

Ilk asamada kulube "her alani doldur" demek yerine:

- zorunlu: ad soyad,
- cok onerilen: tam dogum tarihi,
- tekrar testte zorunluya yakin: Athletic Labs ID,
- veliye devredilebilir: telefon, onay, e-posta.

Bu yaklaşim saha gercegine daha uygundur.

### 8. Test Sonu Otomatik Kimlik Teslimi

Her yeni sporcuya test sonunda Athletic Labs ID teslim edilir:

- web panelde gosterilir,
- raporda yer alir,
- QR olarak verilir,
- veli telefonuna SMS/WhatsApp ile iletilebilir,
- kulube "sonraki testte bu ID'leri kullanin" listesi verilir.

Bu aliskanlik oturdugunda tekrar testlerde kimlik sorunu dramatik sekilde azalir.

## Portal ve Dashboard Veri Hikayesi

Portal karne mantigindan cikmali ve sporcunun yasayan gelisim paneli olmalidir.

Ana bolumler:

- bugunku durum ozeti,
- gelisim gecmisi,
- saha performans testleri,
- Youji Health vucut kompozisyonu,
- VALD performans verileri,
- yas grubu/branş/cinsiyet karsilastirmalari,
- guclu yonler,
- gelisim alanlari,
- antrenman odaklari,
- veri kaynaklari ve olcum tarihcesi.

## Uygulama Fazlari

### Faz 1: Kimlik Temeli

- Athletic Labs ID uretimi.
- Global `Athlete` ve `AthleteTest` ayriminin netlestirilmesi.
- Import preview ve confirm import akisi.
- Tam dogum tarihi destegi.
- Supheli eslesme durumlari.

### Faz 2: Portal Girisi

- Athletic Labs ID + ad soyad girisi.
- ID kayip akisi: telefon dogrulama + dogum tarihi onayi.
- Sporcu/veli panel erisim kayitlari.
- ID tekrar gosterme ve QR yenileme.

### Faz 3: Franchise ve Yetki

- Franchise/kulup veri yetkileri.
- Sinirli global aday eslesme gorunumu.
- Merkez admin duplicate inceleme paneli.
- Merge/unlink audit.

### Faz 4: Premium Dashboard

- Athlete bazli zaman cizgisi.
- Youji Health detayli grafikler.
- VALD veri entegrasyonu.
- 2 sporcu karsilastirma.
- Kulup ve antrenor dashboard'u.

### Faz 5: Veri Kalitesi ve Operasyon

- Veli self-service bilgi tamamlama.
- Kulup hazirlik paketi.
- Veri kalitesi skoru.
- Eksik kimlik takip paneli.
- Franchise kalite raporlari.

## Backend Entegrasyon Notlari

Yeni endpoint mantigi:

```text
POST /test-sessions/:id/athletes/preview-import
POST /test-sessions/:id/athletes/confirm-import
GET  /athletes/:athleteId
GET  /athletes/:athleteId/timeline
POST /athletes/lookup
POST /athletes/recover-access
POST /athletes/verify-recovery-code
POST /admin/athletes/:athleteId/merge
POST /admin/athletes/:athleteId/unlink
```

Mevcut `athleteTestId` tabanli saha veri girisi korunabilir. Yeni mimari mevcut operasyonu kirmaz; sadece import ve portal katmanina kimlik akli ekler.

## Frontend Entegrasyon Notlari

Ilk frontend degisiklikleri:

- test oturumu olusturma ekraninda import preview adimi,
- eslesme onay ekranı,
- supheli kayit uyarilari,
- Athletic Labs ID gosterimi,
- sporcu portal giris ekranı,
- ID kayip/kurtarma akisi,
- kulup veri kalitesi paneli.

Mevcut `test-data-entry` sayfasi `athleteTestId` ile calismaya devam edebilir. Sporcu dashboard'u ise `athleteId` merkezli kurulmalidir.

## Acik Kararlar

- Athletic Labs ID formatinin kesinlestirilmesi.
- Telefon dogrulama saglayicisi.
- Portalda hangi veri icin ikinci dogrulamanin zorunlu olacagi.
- Merge isleminin ilk fazda geri alinabilir mi yoksa sadece merkez admin tarafindan unlink ile mi duzeltilecegi.
- Franchise aday eslesme ekraninda ne kadar bilgi gosterilecegi.
- Kulup hazirlik paketinin e-posta, WhatsApp veya panel uzerinden mi calisacagi.
