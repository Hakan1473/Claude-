package com.example.hospitalinterpreter.model

import kotlinx.serialization.Serializable

@Serializable
enum class Speaker {
    NURSE,
    PATIENT,
    SYSTEM
}

@Serializable
data class LanguageOption(
    val code: String,
    val name: String,
    val nameTr: String,
    val country: String,
    val flag: String
)

@Serializable
enum class ClinicalEntityType {
    MEDICATION,
    ALLERGY,
    CHRONIC_DISEASE,
    SURGERY,
    VITAL_OR_METRIC,
    HABIT,
    FAMILY_HISTORY,
    DOSAGE
}

@Serializable
data class HighlightedEntity(
    val text: String,
    val type: ClinicalEntityType,
    val labelTr: String
)

@Serializable
data class LiveAnamnesisState(
    val chiefComplaints: List<String> = emptyList(),
    val patientNeedsAndRequests: List<String> = emptyList(),
    val medications: List<String> = emptyList(),
    val allergies: List<String> = emptyList(),
    val chronicDiseases: List<String> = emptyList(),
    val pastSurgeries: List<String> = emptyList(),
    val habits: List<String> = emptyList(),
    val familyHistory: List<String> = emptyList(),
    val clinicalInstructions: List<String> = emptyList(),
    val vitalsAndMetrics: List<String> = emptyList(),
    val lastUpdated: Long = System.currentTimeMillis()
)

@Serializable
data class TranscriptMessage(
    val id: String,
    val speaker: Speaker,
    val originalText: String,
    val translatedText: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val language: String? = null,
    val highlightedEntities: List<HighlightedEntity> = emptyList(),
    val showTutorialVideo: Boolean = false,
    val tutorialVideoType: String? = null, // "nurse_call" or "triflow"
    val tutorialVideoTitle: String? = null
)

enum class SessionState {
    IDLE,
    CONNECTING,
    READY,
    LISTENING,
    INTERPRETING,
    SPEAKING,
    ERROR
}

@Serializable
data class ConversationSummary(
    val briefSummaryTr: String,
    val patientChiefComplaints: List<String>,
    val patientNeedsAndRequests: List<String>,
    val clinicalInstructions: List<String>,
    val vitalSignsAndDosages: List<String>,
    val actionItems: List<String>,
    val targetLanguage: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Serializable
data class ConversationHistoryItem(
    val id: String,
    val createdAt: Long,
    val targetLanguage: LanguageOption,
    val messages: List<TranscriptMessage>,
    val summary: ConversationSummary? = null,
    val previewText: String,
    val durationSeconds: Int = 0
)

enum class GeminiVoice(
    val idName: String,
    val displayName: String,
    val gender: String,
    val toneTr: String,
    val descriptionTr: String
) {
    ZEPHYR("Zephyr", "Zephyr (Önerilen)", "Kadın", "Sakin & Güven Verici", "Yumuşak, net ve klinik iletişime uygun"),
    PUCK("Puck", "Puck", "Erkek", "Dinamik & Net", "Canlı ve dikkat çekici ton"),
    AOEDE("Aoede", "Aoede", "Kadın", "Şefkatli & Sıcak", "Empatik ve teskin edici ton"),
    CHARON("Charon", "Charon", "Erkek", "Otoriter & Derin", "Ciddi ve tok klinik ifade"),
    FENRIR("Fenrir", "Fenrir", "Erkek", "Kendinden Emin", "Hızlı ve belirgin ifade"),
    KORE("Kore", "Kore", "Kadın", "Doğal & Dingin", "Yavaş ve dengeli konuşma")
}

data class MedicalTutorial(
    val type: String, // "nurse_call" | "triflow"
    val title: String,
    val description: String,
    val keySteps: List<String>
)

data class NurseAlert(
    val id: String,
    val title: String,
    val message: String,
    val priority: AlertPriority,
    val timestamp: Long = System.currentTimeMillis()
)

enum class AlertPriority {
    URGENT,
    HIGH,
    NORMAL
}
