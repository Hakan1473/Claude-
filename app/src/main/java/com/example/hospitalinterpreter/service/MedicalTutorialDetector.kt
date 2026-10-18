package com.example.hospitalinterpreter.service

import com.example.hospitalinterpreter.model.MedicalTutorial
import java.util.Locale

object MedicalTutorialDetector {

    data class DetectionResult(
        val shouldShow: Boolean,
        val type: String? = null,
        val tutorial: MedicalTutorial? = null
    )

    private fun normalize(text: String?): String {
        if (text.isNullOrBlank()) return ""
        return text.lowercase(Locale("tr"))
            .replace("ç", "c")
            .replace("ğ", "g")
            .replace("ı", "i")
            .replace("ö", "o")
            .replace("ş", "s")
            .replace("ü", "u")
            .trim()
    }

    fun detectTutorial(originalText: String, translatedText: String? = null): DetectionResult {
        val normOrig = normalize(originalText)
        val normTrans = normalize(translatedText)
        val combined = "$normOrig $normTrans"

        // 1. Check Triflow device training
        val isTriflowKeyword = combined.contains("triflow") ||
                combined.contains("solunum egzersiz") ||
                combined.contains("nefes egzersiz") ||
                combined.contains("spirometre") ||
                (combined.contains("solunum cihaz") && (combined.contains("top") || combined.contains("cek")))

        val isTriflowEducational = combined.contains("kullan") ||
                combined.contains("derin nefes") ||
                combined.contains("agziniza") ||
                combined.contains("top") ||
                combined.contains("saatte bir") ||
                combined.contains("gostereyim") ||
                combined.contains("ogreteyim") ||
                combined.contains("akciger") ||
                combined.contains("inhale")

        val isTriflowInquiry = combined.contains("nerede") ||
                combined.contains("yaninizda mi") ||
                combined.contains("bozuldu mu") ||
                combined.contains("en son ne zaman")

        if (isTriflowKeyword && isTriflowEducational && !isTriflowInquiry) {
            return DetectionResult(
                shouldShow = true,
                type = "triflow",
                tutorial = MedicalTutorial(
                    type = "triflow",
                    title = "Triflow Solunum Egzersiz Cihazı Eğitimi",
                    description = "Akciğer kapasitesini artırmak ve ameliyat sonrası atelektaziyi önlemek için solunum egzersiz cihazı kullanımı:",
                    keySteps = listOf(
                        "1. Dik pozisyonda rahatça oturun.",
                        "2. Ağızlığı dudaklarınızın arasına hava sızdırmayacak şekilde sıkıca yerleştirin.",
                        "3. Kuvvetli ve derin bir nefes çekerek 3 topu da yukarı kaldırmaya çalışın.",
                        "4. Topları havada en az 2-3 saniye tutun, ardından yavaşça nefesi verin.",
                        "5. Saatte bir kez 10 tekrar yapın ve aralarda dinlenin."
                    )
                )
            )
        }

        // 2. Check Nurse Call Button training
        val isNurseCallKeyword = combined.contains("hemsire cagir") ||
                combined.contains("cagri buton") ||
                combined.contains("cagri zil") ||
                combined.contains("hasta cagri") ||
                combined.contains("kirmizi buton") ||
                combined.contains("nurse call") ||
                combined.contains("call button") ||
                (combined.contains("buton") && (combined.contains("cagir") || combined.contains("haber ver") || combined.contains("yardim") || combined.contains("agri")))

        val isNurseCallEducational = combined.contains("istediginiz zaman") ||
                combined.contains("her zaman") ||
                combined.contains("ihtiyac") ||
                combined.contains("sikayet") ||
                combined.contains("agriniz olursa") ||
                combined.contains("kalkmadan once") ||
                combined.contains("yardim icin") ||
                combined.contains("butona bas") ||
                combined.contains("zile bas") ||
                combined.contains("haber verin") ||
                combined.contains("bizi cagirin") ||
                combined.contains("press the button") ||
                combined.contains("whenever you need")

        val isNurseCallInquiry = combined.contains("siz mi bastiniz") ||
                combined.contains("yanlislikla mi") ||
                combined.contains("kim basti") ||
                combined.contains("bozuldu mu") ||
                combined.contains("neden cagirdiniz")

        if (isNurseCallKeyword && isNurseCallEducational && !isNurseCallInquiry) {
            return DetectionResult(
                shouldShow = true,
                type = "nurse_call",
                tutorial = MedicalTutorial(
                    type = "nurse_call",
                    title = "Hemşire Çağrı Butonu Kullanım Eğitimi",
                    description = "Yatak başı hemşire çağrı ünitesi bilgilendirmesi:",
                    keySteps = listOf(
                        "1. Buton yatağınızın başucunda veya elinizin altında asılıdır.",
                        "2. Ağrı, baş dönmesi, bulantı veya herhangi bir şikayetiniz olduğunda kırmızı butona basın.",
                        "3. Yataktan tek başınıza kalkmadan önce güvenliğiniz için mutlaka hemşireyi çağırın.",
                        "4. Butona bastığınızda hemşire bankosunda çağrınız ve oda numaranız anında görünür.",
                        "5. Görevli hemşire en kısa sürede yanınıza gelecektir."
                    )
                )
            )
        }

        return DetectionResult(shouldShow = false)
    }
}
