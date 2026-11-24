# 📱 تحويل وِرْد إلى تطبيق أندرويد (APK) وتثبيته على تليفونك

المشروع جاهز بالكامل (Capacitor + أيقونات + إشعارات أصلية + يعمل بدون نت).
اختر **أسهل طريقة** من الاتنين:

---

## الطريقة 1 (الأسهل — من غير ما تنزّل برامج) ✅
ارفع المشروع على GitHub مرة واحدة، وGitHub هيبني لك الـAPK تلقائياً:

1. اعمل Repository جديد على GitHub وارفع عليه المشروع كله.
2. افتح تبويب **Actions** → اختر **Build وَرْد Android APK** → **Run workflow**.
3. استنى ٥–١٠ دقايق، في آخر الصفحة هتلاقي **Artifacts** → نزّل **ward-debug-apk**.
4. فكّ الضغط: هتلاقي `app-debug.apk`.
5. انقله للتليفون (واتساب/كابل/Google Drive) وافتحه.
6. لو ظهر «تثبيت من مصادر غير معروفة» → اسمح للمرة الواحدة ← **تثبيت**.

> كل مرة تعدّل الكود وترفع، GitHub يبني APK جديد تلقائياً (الصيغة موجودة في `.github/workflows/android-apk.yml`).

---

## الطريقة 2 (من جهازك بـ Android Studio)
1. نزّل [Android Studio](https://developer.android.com/studio) وثبّت الـSDK.
2. Terminal داخل المشروع:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
3. Android Studio → **Open** → اختر مجلد `android`.
4. استنى Gradle Sync يخلص.
5. **Build ▸ Build App Bundle(s)/APK(s) ▸ Build APK(s)**.
6. الملف: `android/app/build/outputs/apk/debug/app-debug.apk`.

### نسخة للنشر على Google Play
- من القائمة: **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle**.
- اعمل مفتاح توقيع (Keystore) واحفظه وبياناته في مكان آمن.
- ارفع ملف `.aab` على [Play Console](https://play.google.com/console) بعد إنشاء التطبيق.

---

## معلومات نسخة الأندرويد
| العنصر | القيمة |
|---|---|
| اسم التطبيق | وِرْد |
| Package ID | `com.waleedsebai.quran` |
| اللغات/الاتجاه | عربي RTL |
| يعمل بدون إنترنت | نعم (مصحف + تفسير + مواقيت + أذكار) |
| إشعارات مجدولة والتطبيق مغلق | نعم (`@capacitor/local-notifications`) |
| الصلاحيات | إشعارات، منبهات دقيقة، موقع (اختياري للمواقيت)، إنترنت |

## تحديث التطبيق بعد أي تعديل
```bash
npm run build
npx cap sync android
```
ثم أعد بناء الـAPK من Android Studio (أو ارفع الكود وGitHub يبنيه).
