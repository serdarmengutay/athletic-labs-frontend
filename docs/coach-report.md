# Antrenör raporu

Test veri girişinin liste ekranındaki **Antrenör Raporu Çıkar** düğmesi sporcu seçimini açar. İsim ve doğum yılı filtreleri seçimleri korur; **Görünenleri seç** yalnızca filtrelenen listeyi değiştirir. Grup/antrenör adı isteğe bağlıdır.

PDF yalnızca seçilen sporcuları, sayfa başına en fazla sekiz kişi olacak şekilde içerir. Veriler mevcut `calculate-report` yanıtından alınır. `getAthleteReportData` hem bireysel karne hem antrenör raporu tarafından kullanıldığından sprint sıralaması, alan görünürlüğü, skorlar, fiziksel ölçümler ve genel performans aynı kalır. QR hedefi `youjiSummary.deviceReportUrl` alanıdır; PDF'deki QR alanları tıklanabilir. QR yoksa başka bir bağlantı üretilmez.

Rapor oluşturma ölçüm kaydetmez ve testi tamamlama akışını çalıştırmaz. Bekleyen çevrimdışı kayıtlar varsa senkronizasyon beklenir. Seçilen bir sporcunun karnesi sunucudan dönmezse eksik PDF indirmek yerine hata gösterilir.

Marka stilleri `CoachReport.module.css` içinde sınırlıdır. Renkler tasarım paletindeki `#FD003E`, `#ECECEC` ve `#1A1D1A` değerleridir; logo sağlanan `ATHLETIC LABS-01.png` dosyasıdır. Degular Variable ve Pilat font dosyaları henüz projede yoktur. Kullanıcı onayıyla ilgili font adları ve Arial/sans-serif yedeği tanımlandı. Dosyalar geldiğinde bu modüle yerel `@font-face` tanımları eklenmelidir.

Veri ve seçim kontrolleri: `node --test tests/coach-report.test.cjs`.
