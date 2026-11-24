import type { Reciter } from "../lib/api";

/* ============================================================
   Featured reciter: Hussein Al-Azzam (حسين العزام)
   Not listed on MP3Quran — curated from public archive.org
   recordings (17 surahs, calm recitation without effects).
   URLs verified live (audio/mpeg + CORS).
   ============================================================ */

export const FEATURED_RECITERS: Reciter[] = [
  {
    id: -1,
    name: "حسين العزام",
    letter: "ح",
    moshaf: [
      {
        id: -1,
        name: "تسجيلات مختارة • تلاوة هادئة بدون مؤثرات",
        server: "",
        surah_total: 17,
        moshaf_type: 11,
        surah_list: "1,12,14,15,18,19,26,27,30,36,44,52,55,67,75,79,89",
        tracks: {
                "1": "https://archive.org/download/20241124_20241124_1556/001%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%81%D8%A7%D8%AA%D8%AD%D8%A9%20%D9%85%D9%86%20%D8%B5%D9%84%D8%A7%D8%A9%20%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8%20%D8%A7%D9%84%D9%8A%D9%88%D9%85%20-%20%D9%85%D8%B3%D8%AC%D8%AF%20%D8%A8%D9%84%D8%A7%D9%84%20%D8%A8%D9%86%20%D8%B1%D8%A8%D8%A7%D8%AD%20_%20%D8%A7%D9%84%D8%A3%D8%B1%D8%AF%D9%86.mp3",
                "12": "https://archive.org/download/surat_elmulk/surat_youssef.mp3",
                "14": "https://archive.org/download/surat_elmulk/surat_ibrahim.mp3",
                "15": "https://archive.org/download/surat_elmulk/surat_elhajr.mp3",
                "18": "https://archive.org/download/surat_elmulk/surat_elkahf.mp3",
                "19": "https://archive.org/download/20241124_20241124_1556/019%20_%20%D8%AA%D9%84%D8%A7%D9%88%D8%A9%20%D9%85%D9%86%20%D8%B3%D9%88%D8%B1%D8%A9%20%D9%85%D8%B1%D9%8A%D9%85%20%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "26": "https://archive.org/download/20241124_20241124_1556/026%20_%20%D8%AA%D9%84%D8%A7%D9%88%D8%A9%20%D9%85%D9%86%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D8%B4%D8%B9%D8%B1%D8%A7%D8%A1%20%D9%84%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "27": "https://archive.org/download/20241124_20241124_1556/027%20_%20%D8%AA%D9%84%D8%A7%D9%88%D8%A9%20%D9%85%D8%B1%D9%8A%D8%AD%D8%A9%20%D9%85%D9%86%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%86%D9%85%D9%84%20_%20%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "30": "https://archive.org/download/20241124_20241124_1556/030%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D8%B1%D9%88%D9%85%20%D8%AA%D9%84%D8%A7%D9%88%D8%A9%20%D8%B1%D9%85%D8%B6%D8%A7%D9%86%D9%8A%D8%A9%20%D9%85%D9%86%20%D8%B5%D9%84%D8%A7%D8%A9%20%D8%A7%D9%84%D8%AA%D8%B1%D8%A7%D9%88%D9%8A%D8%AD%20-%20%D9%85%D8%B3%D8%AC%D8%AF%20%D8%A8%D9%84%D8%A7%D9%84%20%D8%A8%D9%86%20%D8%B1%D8%A8%D8%A7%D8%AD.mp3",
                "36": "https://archive.org/download/surat_elmulk/surat_yas.mp3",
                "44": "https://archive.org/download/20241124_20241124_1556/044%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D8%AF%D8%AE%D8%A7%D9%86%20_%20%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "52": "https://archive.org/download/20241124_20241124_1556/052%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D8%B7%D9%88%D8%B1%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D8%B7%D9%88%D8%B1%20%D9%83%D8%A7%D9%85%D9%84%D8%A9.mp3",
                "55": "https://archive.org/download/surat_elmulk/surat_elrahman.mp3",
                "67": "https://archive.org/download/20241124_20241124_1556/067%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%85%D9%84%D9%83%20%D8%AA%D9%84%D8%A7%D9%88%D8%A9%20%D8%AE%D8%A7%D8%B4%D8%B9%D8%A9%20%D8%A8%D8%AF%D9%88%D9%86%20%D8%B5%D8%AF%D9%89%20__%20%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "75": "https://archive.org/download/20241124_20241124_1556/075%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%82%D9%8A%D8%A7%D9%85%D8%A9%20%D9%83%D8%A7%D9%85%D9%84%D8%A9%20%D8%A8%D8%AF%D9%88%D9%86%20%D9%85%D8%A4%D8%AB%D8%B1%D8%A7%D8%AA__%20%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "79": "https://archive.org/download/20241124_20241124_1556/079%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%86%D8%A7%D8%B2%D8%B9%D8%A7%D8%AA%20%D8%A8%D8%AF%D9%88%D9%86%20%D9%85%D8%A4%D8%AB%D8%B1%D8%A7%D8%AA%20_%20%D8%A7%D9%84%D9%82%D8%A7%D8%B1%D8%A6%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85.mp3",
                "89": "https://archive.org/download/20241124_20241124_1556/089%20_%20%D8%B3%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%81%D8%AC%D8%B1%20%D9%85%D9%83%D8%AA%D9%88%D8%A8%D8%A9%20%D9%83%D8%A7%D9%85%D9%84%D8%A9%20%D8%A8%D8%B5%D9%88%D8%AA%20%D8%AD%D8%B3%D9%8A%D9%86%20%D8%A7%D9%84%D8%B9%D8%B2%D8%A7%D9%85%20_%20Quran%20Surah%20Al-Fajr.mp3"
        },
      },
    ],
  },
];
