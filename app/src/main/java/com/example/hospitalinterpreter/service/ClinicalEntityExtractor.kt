package com.example.hospitalinterpreter.service

import com.example.hospitalinterpreter.model.ClinicalEntityType
import com.example.hospitalinterpreter.model.HighlightedEntity
import com.example.hospitalinterpreter.model.LiveAnamnesisState
import com.example.hospitalinterpreter.model.Speaker
import com.example.hospitalinterpreter.model.TranscriptMessage
import java.util.Locale

object ClinicalEntityExtractor {

    private val medicationKeywords = listOf(
        "parol", "parasetamol", "augmentin", "beloc", "novalgin", "metamizol",
        "arveles", "diklofenak", "coraspin", "aspirin", "metformin", "glifor",
        "lansor", "pantoprazol", "clexane", "heparin", "ventolin", "salbutamol",
        "antibiyotik", "ağrı kesici", "serum", "morfin", "prednol", "kortizon",
        "insülin", "nexium", "apranax", "majezik", "dolorex", "muscoril"
    )

    private val allergyKeywords = listOf(
        "penisilin", "lateks", "kontrast", "arı", "fıstık", "yumurta",
        "sülfonamid", "aspirin alerjisi", "iyot", "toz", "polen"
    )

    private val chronicKeywords = listOf(
        "diyabet", "şeker hastalığı", "hipertansiyon", "yüksek tansiyon",
        "astım", "koah", "kalp yetmezliği", "ritim bozukluğu", "guatr",
        "tiroid", "böbrek yetmezliği", "reflü", "epilepsi", "romatizma"
    )

    private val surgeryKeywords = listOf(
        "apandisit", "bypass", "safra kesesi", "kolesistektomi", "sezaryen",
        "stent", "fıtık", "bademcik", "protez", "anjiyo", "ameliyat", "operasyon"
    )

    private val chiefComplaintKeywords = listOf(
        "ağrı", "sancı", "yanma", "batma", "nefes darlığı", "bulantı", "kusma",
        "baş dönmesi", "bayılma", "çarpıntı", "ateş", "titreme", "öksürük",
        "halsizlik", "uyuşma", "şişlik", "kanama", "ishal", "kabızlık"
    )

    private val needKeywords = listOf(
        "su", "yastık", "battaniye", "doktor", "tuvalet", "yardım", "üşüdüm",
        "kalkmak", "yatmak", "hemşire", "ısıtıcı", "havlu", "peçete"
    )

    private val habitKeywords = listOf(
        "sigara", "alkol", "paket", "tütün", "nargile", "içiyorum", "bıraktım"
    )

    private val familyKeywords = listOf(
        "annemde", "babamda", "kardeşimde", "ailede", "genetik", "dayımda", "teyzemde"
    )

    fun extractEntities(text: String): List<HighlightedEntity> {
        val lower = text.lowercase(Locale("tr"))
        val entities = mutableListOf<HighlightedEntity>()

        // Check medications
        for (kw in medicationKeywords) {
            if (lower.contains(kw)) {
                entities.add(HighlightedEntity(kw.replaceFirstChar { it.uppercase() }, ClinicalEntityType.MEDICATION, "İlaç"))
            }
        }

        // Check allergies
        for (kw in allergyKeywords) {
            if (lower.contains(kw) || lower.contains("$kw alerjisi")) {
                entities.add(HighlightedEntity(kw.replaceFirstChar { it.uppercase() }, ClinicalEntityType.ALLERGY, "Alerji"))
            }
        }

        // Check chronic diseases
        for (kw in chronicKeywords) {
            if (lower.contains(kw)) {
                entities.add(HighlightedEntity(kw.replaceFirstChar { it.uppercase() }, ClinicalEntityType.CHRONIC_DISEASE, "Kronik"))
            }
        }

        // Check surgeries
        for (kw in surgeryKeywords) {
            if (lower.contains(kw)) {
                entities.add(HighlightedEntity(kw.replaceFirstChar { it.uppercase() }, ClinicalEntityType.SURGERY, "Ameliyat"))
            }
        }

        // Check dosages
        val dosageRegex = Regex("""\b(\d+(\.\d+)?\s*(mg|mcg|ml|g|ünite|puf|ölçek))\b""", RegexOption.IGNORE_CASE)
        dosageRegex.findAll(lower).forEach { match ->
            entities.add(HighlightedEntity(match.value, ClinicalEntityType.DOSAGE, "Dozaj"))
        }

        // Check vitals
        val vitalsRegex = Regex("""\b(\d{2,3}[/\\]\d{2,3}|\d{2}\.\d\s*°?C|\b\d{2,3}\s*(nabız|bpm|tansiyon))\b""", RegexOption.IGNORE_CASE)
        vitalsRegex.findAll(lower).forEach { match ->
            entities.add(HighlightedEntity(match.value, ClinicalEntityType.VITAL_OR_METRIC, "Vital"))
        }

        return entities.distinctBy { it.text.lowercase() }
    }

    fun buildRealtimeAnamnesis(messages: List<TranscriptMessage>): LiveAnamnesisState {
        val complaints = mutableSetOf<String>()
        val needs = mutableSetOf<String>()
        val medications = mutableSetOf<String>()
        val allergies = mutableSetOf<String>()
        val chronic = mutableSetOf<String>()
        val surgeries = mutableSetOf<String>()
        val habits = mutableSetOf<String>()
        val family = mutableSetOf<String>()
        val instructions = mutableSetOf<String>()
        val vitals = mutableSetOf<String>()

        for (msg in messages) {
            val text = (msg.translatedText ?: msg.originalText).lowercase(Locale("tr"))

            // Medications
            for (kw in medicationKeywords) {
                if (text.contains(kw)) medications.add(kw.replaceFirstChar { it.uppercase() })
            }

            // Allergies
            for (kw in allergyKeywords) {
                if (text.contains(kw)) allergies.add("$kw Alerjisi".replaceFirstChar { it.uppercase() })
            }

            // Chronic
            for (kw in chronicKeywords) {
                if (text.contains(kw)) chronic.add(kw.replaceFirstChar { it.uppercase() })
            }

            // Surgeries
            for (kw in surgeryKeywords) {
                if (text.contains(kw)) surgeries.add(kw.replaceFirstChar { it.uppercase() })
            }

            // Complaints (especially if spoken by patient)
            if (msg.speaker == Speaker.PATIENT) {
                for (kw in chiefComplaintKeywords) {
                    if (text.contains(kw)) complaints.add(kw.replaceFirstChar { it.uppercase() })
                }
                for (kw in needKeywords) {
                    if (text.contains(kw)) needs.add(kw.replaceFirstChar { it.uppercase() })
                }
            }

            // Nursing instructions (if spoken by nurse)
            if (msg.speaker == Speaker.NURSE) {
                if (text.contains("nefes") || text.contains("ilaç") || text.contains("buton") ||
                    text.contains("kolunuzu") || text.contains("pansuman") || text.contains("saat") ||
                    text.contains("yataktan") || text.contains("serum")
                ) {
                    instructions.add(msg.originalText.take(60) + if (msg.originalText.length > 60) "..." else "")
                }
            }

            // Habits
            for (kw in habitKeywords) {
                if (text.contains(kw)) habits.add(kw.replaceFirstChar { it.uppercase() })
            }

            // Family History
            for (kw in familyKeywords) {
                if (text.contains(kw)) family.add(msg.originalText.take(50))
            }

            // Vitals
            val vitalsRegex = Regex("""(\d{2,3}[/\\]\d{2,3}|\d{2}\.\d\s*°?C|\b\d{2,3}\s*(nabız|bpm))""", RegexOption.IGNORE_CASE)
            vitalsRegex.findAll(text).forEach { vitals.add(it.value) }
        }

        return LiveAnamnesisState(
            chiefComplaints = complaints.toList(),
            patientNeedsAndRequests = needs.toList(),
            medications = medications.toList(),
            allergies = allergies.toList(),
            chronicDiseases = chronic.toList(),
            pastSurgeries = surgeries.toList(),
            habits = habits.toList(),
            familyHistory = family.toList(),
            clinicalInstructions = instructions.toList(),
            vitalsAndMetrics = vitals.toList(),
            lastUpdated = System.currentTimeMillis()
        )
    }
}
