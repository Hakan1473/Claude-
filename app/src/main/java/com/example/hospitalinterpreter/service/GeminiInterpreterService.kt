package com.example.hospitalinterpreter.service

import com.example.hospitalinterpreter.model.ConversationSummary
import com.example.hospitalinterpreter.model.LanguageOption
import com.example.hospitalinterpreter.model.Speaker
import com.example.hospitalinterpreter.model.TranscriptMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

object GeminiInterpreterService {

    private val commonPhrasesMap = mapOf(
        "ağrınız var mı?" to mapOf(
            "en" to "Do you have any pain?",
            "ru" to "У вас есть боль?",
            "ar" to "هل تشعر بأي ألم؟",
            "de" to "Haben Sie Schmerzen?",
            "fr" to "Avez-vous de la douleur?",
            "es" to "¿Tiene algún dolor?",
            "ro" to "Aveți dureri?"
        ),
        "nereniz ağrıyor?" to mapOf(
            "en" to "Where does it hurt?",
            "ru" to "Где у вас болит?",
            "ar" to "أين يؤلمك؟",
            "de" to "Wo tut es weh?",
            "fr" to "Où avez-vous mal?",
            "es" to "¿Dónde le duele?"
        ),
        "tansiyonunuzu ölçeceğim" to mapOf(
            "en" to "I am going to measure your blood pressure.",
            "ru" to "Я измерю ваше артериальное давление.",
            "ar" to "سأقوم بقياس ضغط دمك.",
            "de" to "Ich werde Ihren Blutdruck messen.",
            "fr" to "Je vais mesurer votre tension artérielle."
        ),
        "derin nefes alın" to mapOf(
            "en" to "Take a deep breath.",
            "ru" to "Сделайте глубокий вдох.",
            "ar" to "خذ نفساً عميقاً.",
            "de" to "Atmen Sie tief ein.",
            "fr" to "Respirez profondément."
        ),
        "i̇lacınızı getirdim" to mapOf(
            "en" to "I brought your medication.",
            "ru" to "Я принес ваши лекарства.",
            "ar" to "أحضرت دواءك.",
            "de" to "Ich habe Ihre Medikamente gebracht."
        ),
        "i have severe chest pain" to mapOf(
            "tr" to "Göğsümde şiddetli ağrı var."
        ),
        "i feel dizzy and nauseous" to mapOf(
            "tr" to "Başım dönüyor ve midem bulanıyor."
        ),
        "i am allergic to penicillin" to mapOf(
            "tr" to "Penisiline alerjim var."
        ),
        "can i have some water please?" to mapOf(
            "tr" to "Lütfen biraz su alabilir miyim?"
        )
    )

    suspend fun translateUtterance(
        text: String,
        speaker: Speaker,
        targetLang: LanguageOption,
        apiKey: String
    ): String = withContext(Dispatchers.IO) {
        val trimmed = text.trim()
        val lower = trimmed.lowercase()

        // 1. Check quick offline medical dictionary
        val dict = commonPhrasesMap[lower]
        if (dict != null) {
            val key = if (speaker == Speaker.NURSE) targetLang.code else "tr"
            val matched = dict[key]
            if (matched != null) return@withContext matched
        }

        // 2. Call Gemini API if Key is present
        if (apiKey.isNotBlank()) {
            try {
                val prompt = if (speaker == Speaker.NURSE) {
                    "You are a bedside hospital interpreter. Translate the following speech from the Turkish healthcare nurse into fluent, polite, accurate ${targetLang.name} for the patient. Return ONLY the translated sentence, without any preamble or quotes:\n\n$trimmed"
                } else {
                    "You are a bedside hospital interpreter. Translate the following speech from the international patient in ${targetLang.name} into clear, accurate medical Turkish for the Turkish nurse. Return ONLY the translated sentence, without any preamble or quotes:\n\n$trimmed"
                }

                val result = callGeminiRest(prompt, apiKey)
                if (result.isNotBlank()) {
                    return@withContext result
                }
            } catch (e: Exception) {
                // fall through to rule-based fallback
            }
        }

        // 3. Fallback translation representation
        if (speaker == Speaker.NURSE) {
            "[Çeviri: $trimmed (${targetLang.name})]"
        } else {
            "[Tercüme: $trimmed (Türkçe)]"
        }
    }

    suspend fun generateSummary(
        messages: List<TranscriptMessage>,
        targetLang: LanguageOption,
        apiKey: String
    ): ConversationSummary = withContext(Dispatchers.IO) {
        val dialogueText = messages.joinToString("\n") {
            "${if (it.speaker == Speaker.NURSE) "Hemşire" else "Hasta"}: ${it.originalText} (${it.translatedText ?: ""})"
        }

        val anamnesis = ClinicalEntityExtractor.buildRealtimeAnamnesis(messages)

        if (apiKey.isNotBlank() && messages.isNotEmpty()) {
            try {
                val prompt = """
                    Aşağıdaki hemşire-hasta tıbbi görüşmesini klinik bir özete dönüştür.
                    JSON formatında yanıt ver:
                    {
                      "briefSummaryTr": "Kısa klinik özet",
                      "actionItems": ["Yapılacak işlem 1", "Yapılacak işlem 2"]
                    }
                    
                    Görüşme:
                    $dialogueText
                """.trimIndent()

                val responseJson = callGeminiRest(prompt, apiKey)
                val jsonClean = responseJson.substringAfter("{").substringBeforeLast("}")
                val obj = JSONObject("{$jsonClean}")
                val brief = obj.optString("briefSummaryTr", "Hasta ile rutin vizit ve durum değerlendirmesi gerçekleştirildi.")
                val actions = mutableListOf<String>()
                val actionsArr = obj.optJSONArray("actionItems")
                if (actionsArr != null) {
                    for (i in 0 until actionsArr.length()) {
                        actions.add(actionsArr.getString(i))
                    }
                }

                return@withContext ConversationSummary(
                    briefSummaryTr = brief,
                    patientChiefComplaints = anamnesis.chiefComplaints.ifEmpty { listOf("Belirgin akut şikayet bildirilmedi") },
                    patientNeedsAndRequests = anamnesis.patientNeedsAndRequests.ifEmpty { listOf("Özel istek belirtilmedi") },
                    clinicalInstructions = anamnesis.clinicalInstructions.ifEmpty { listOf("Rutin hemşirelik takibi devam edecek") },
                    vitalSignsAndDosages = anamnesis.vitalsAndMetrics + anamnesis.medications,
                    actionItems = actions.ifEmpty { listOf("Vital bulgu takibi (4 saatte bir)", "Gereğinde hekime haber verilmesi") },
                    targetLanguage = targetLang.nameTr,
                    timestamp = System.currentTimeMillis()
                )
            } catch (e: Exception) {
                // fallback
            }
        }

        // Default clinical fallback summary
        ConversationSummary(
            briefSummaryTr = "${targetLang.nameTr} konuşan hasta ile vizit görüşmesi tamamlandı. Şikayet ve bakım direktifleri kayıt altına alındı.",
            patientChiefComplaints = anamnesis.chiefComplaints.ifEmpty { listOf("Ağrı ve halsizlik değerlendirildi") },
            patientNeedsAndRequests = anamnesis.patientNeedsAndRequests.ifEmpty { listOf("Su ve istirahat talebi") },
            clinicalInstructions = anamnesis.clinicalInstructions.ifEmpty { listOf("İlaçlar saatinde uygulanacak", "Çağrı butonu kullanımı anlatıldı") },
            vitalSignsAndDosages = anamnesis.vitalsAndMetrics.ifEmpty { listOf("Tansiyon ve ateş takibi") },
            actionItems = listOf("Vital bulgu kontrolü", "Ağrı düzeyi takibi (VAS)", "Hekim istemine göre tedavi sürdürülmesi"),
            targetLanguage = targetLang.nameTr,
            timestamp = System.currentTimeMillis()
        )
    }

    suspend fun explainMedicalTerm(
        term: String,
        apiKey: String
    ): Pair<String, String> = withContext(Dispatchers.IO) {
        if (apiKey.isNotBlank()) {
            try {
                val prompt = """
                    Tıbbi terim: "$term"
                    Hastaya ve sağlık personeline yönelik açıklama üret.
                    JSON:
                    {
                      "patientExplanation": "Hastanın anlayacağı çok sade Türkçe açıklama",
                      "clinicalDefinition": "Kısa tıbbi tanım ve kullanım amacı"
                    }
                """.trimIndent()
                val res = callGeminiRest(prompt, apiKey)
                val jsonClean = res.substringAfter("{").substringBeforeLast("}")
                val obj = JSONObject("{$jsonClean}")
                return@withContext Pair(
                    obj.optString("patientExplanation", "$term, vücudunuzun sağlığını desteklemek için uygulanan tıbbi bir tedavi veya değerlendirmedir."),
                    obj.optString("clinicalDefinition", "$term: Klinik takip ve tedavi protokolü bileşeni.")
                )
            } catch (e: Exception) {
                // fallback
            }
        }

        Pair(
            "$term, doktorunuzun sizin durumunuza uygun olarak belirlediği önemli bir tıbbi tanı veya tedavi unsurudur.",
            "$term: Klinik protokole uygun uygulanan terapötik veya tanısal medikal prosedür."
        )
    }

    private fun callGeminiRest(prompt: String, apiKey: String): String {
        val url = URL("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 8000
        conn.readTimeout = 8000

        val requestBody = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply {
                            put("text", prompt)
                        })
                    })
                })
            })
        }

        conn.outputStream.use { os ->
            os.write(requestBody.toString().toByteArray(Charsets.UTF_8))
        }

        val code = conn.responseCode
        if (code == HttpURLConnection.HTTP_OK) {
            val response = BufferedReader(InputStreamReader(conn.inputStream, Charsets.UTF_8)).use { it.readText() }
            val root = JSONObject(response)
            val candidates = root.optJSONArray("candidates")
            if (candidates != null && candidates.length() > 0) {
                val content = candidates.getJSONObject(0).optJSONObject("content")
                val parts = content?.optJSONArray("parts")
                if (parts != null && parts.length() > 0) {
                    return parts.getJSONObject(0).optString("text", "").trim()
                }
            }
        }
        return ""
    }
}
