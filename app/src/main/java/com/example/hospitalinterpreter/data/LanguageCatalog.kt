package com.example.hospitalinterpreter.data

import com.example.hospitalinterpreter.model.LanguageOption

object LanguageCatalog {
    val languages: List<LanguageOption> = listOf(
        LanguageOption("en", "English", "İngilizce", "İngiltere / ABD / Uluslararası", "🇬🇧"),
        LanguageOption("ar", "Arabic", "Arapça", "Suriye / Irak / Suudi Arabistan / BAE", "🇸🇦"),
        LanguageOption("ru", "Russian", "Rusça", "Rusya / Belarus / Kazakistan", "🇷🇺"),
        LanguageOption("de", "German", "Almanca", "Almanya / Avusturya / İsviçre", "🇩🇪"),
        LanguageOption("fr", "French", "Fransızca", "Fransa / Belçika / Kuzey Afrika", "🇫🇷"),
        LanguageOption("ro", "Romanian", "Romence", "Romanya / Moldova", "🇷🇴"),
        LanguageOption("zh", "Mandarin Chinese", "Çince (Mandarin)", "Çin / Tayvan", "🇨🇳"),
        LanguageOption("it", "Italian", "İtalyanca", "İtalya / İsviçre", "🇮🇹"),
        LanguageOption("es", "Spanish", "İspanyolca", "İspanya / Latin Amerika", "🇪🇸"),
        LanguageOption("ja", "Japanese", "Japonca", "Japonya", "🇯🇵"),
        LanguageOption("fa", "Persian", "Farsça", "İran / Tacikistan", "🇮🇷"),
        LanguageOption("ka", "Georgian", "Gürcüce", "Gürcistan", "🇬🇪"),
        LanguageOption("az", "Azerbaijani", "Azerice", "Azerbaycan", "🇦🇿"),
        LanguageOption("uz", "Uzbek", "Özbekçe", "Özbekistan", "🇺🇿"),
        LanguageOption("tk", "Turkmen", "Türkmence", "Türkmenistan", "🇹🇲"),
        LanguageOption("kk", "Kazakh", "Kazakça", "Kazakistan", "🇰🇿"),
        LanguageOption("ky", "Kyrgyz", "Kırgızca", "Kırgızistan", "🇰🇬"),
        LanguageOption("uk", "Ukrainian", "Ukraynaca", "Ukrayna", "🇺🇦"),
        LanguageOption("sr", "Serbian", "Sırpça", "Sırbistan / Karadağ", "🇷🇸"),
        LanguageOption("bs", "Bosnian", "Boşnakça", "Bosna Hersek", "🇧🇦"),
        LanguageOption("hr", "Croatian", "Hırvatça", "Hırvatistan", "🇭🇷"),
        LanguageOption("bg", "Bulgarian", "Bulgarca", "Bulgaristan", "🇧🇬"),
        LanguageOption("el", "Greek", "Yunanca", "Yunanistan / Kıbrıs", "🇬🇷"),
        LanguageOption("pl", "Polish", "Lehçe", "Polonya", "🇵🇱"),
        LanguageOption("nl", "Dutch", "Felemenkçe", "Hollanda / Belçika", "🇳🇱"),
        LanguageOption("pt", "Portuguese", "Portekizce", "Portekiz / Brezilya", "🇵🇹"),
        LanguageOption("ko", "Korean", "Korece", "Güney Kore", "🇰🇷"),
        LanguageOption("hi", "Hindi", "Hintçe", "Hindistan", "🇮🇳"),
        LanguageOption("ur", "Urdu", "Urduca", "Pakistan / Hindistan", "🇵🇰"),
        LanguageOption("bn", "Bengali", "Bengalce", "Bangladeş / Hindistan", "🇧🇩"),
        LanguageOption("ku", "Kurdish", "Kürtçe", "Bölgesel / Irak", "☀️"),
        LanguageOption("sq", "Albanian", "Arnavutça", "Arnavutluk / Kosova", "🇦🇱"),
        LanguageOption("so", "Somali", "Somalice", "Somali", "🇸🇴"),
        LanguageOption("ps", "Pashto", "Peştuca", "Afganistan", "🇦🇫"),
        LanguageOption("he", "Hebrew", "İbranice", "İsrail", "🇮🇱"),
        LanguageOption("sv", "Swedish", "İsveççe", "İsveç", "🇸🇪"),
        LanguageOption("no", "Norwegian", "Norveççe", "Norveç", "🇳🇴"),
        LanguageOption("da", "Danish", "Danimarkaca", "Danimarka", "🇩🇰"),
        LanguageOption("fi", "Finnish", "Fince", "Finlandiya", "🇫🇮"),
        LanguageOption("hu", "Hungarian", "Macarca", "Macaristan", "🇭🇺"),
        LanguageOption("cs", "Czech", "Çekçe", "Çekya", "🇨🇿"),
        LanguageOption("sk", "Slovak", "Slovakça", "Slovakya", "🇸🇰"),
        LanguageOption("sl", "Slovenian", "Slovence", "Slovenya", "🇸🇮"),
        LanguageOption("mk", "Macedonian", "Makedonca", "Kuzey Makedonya", "🇲🇰"),
        LanguageOption("id", "Indonesian", "Endonezce", "Endonezya", "🇮🇩"),
        LanguageOption("ms", "Malay", "Malayca", "Malezya", "🇲🇾"),
        LanguageOption("th", "Thai", "Tayca", "Tayland", "🇹🇭"),
        LanguageOption("vi", "Vietnamese", "Vietnamca", "Vietnam", "🇻🇳"),
        LanguageOption("tl", "Filipino", "Filipince", "Filipinler", "🇵🇭"),
        LanguageOption("sw", "Swahili", "Svahili", "Tanzanya / Kenya", "🇹🇿"),
        LanguageOption("hy", "Armenian", "Ermenice", "Ermenistan", "🇦🇲"),
        LanguageOption("lt", "Lithuanian", "Litvanca", "Litvanya", "🇱🇹"),
        LanguageOption("lv", "Latvian", "Letonca", "Letonya", "🇱🇻"),
        LanguageOption("et", "Estonian", "Estonca", "Estonya", "🇪🇪"),
        LanguageOption("am", "Amharic", "Amharca", "Etiyopya", "🇪🇹"),
        LanguageOption("mn", "Mongolian", "Moğolca", "Moğolistan", "🇲🇳"),
        LanguageOption("ne", "Nepali", "Nepalce", "Nepal", "🇳🇵"),
        LanguageOption("pa", "Punjabi", "Pencapça", "Hindistan / Pakistan", "🇮🇳"),
        LanguageOption("ta", "Tamil", "Tamilce", "Hindistan / Sri Lanka", "🇱🇰"),
        LanguageOption("tr", "Turkish", "Türkçe", "Türkiye", "🇹🇷")
    )

    val defaultLanguage: LanguageOption = languages[0] // English

    val popularLanguages: List<LanguageOption> = listOf(
        languages[0], // English
        languages[1], // Arabic
        languages[2], // Russian
        languages[3], // German
        languages[4], // French
        languages[5], // Romanian
        languages[6], // Chinese
        languages[7], // Italian
        languages[8], // Spanish
        languages[9]  // Japanese
    )
}
