package com.example.hospitalinterpreter.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.hospitalinterpreter.data.LanguageCatalog
import com.example.hospitalinterpreter.model.AlertPriority
import com.example.hospitalinterpreter.model.ConversationHistoryItem
import com.example.hospitalinterpreter.model.ConversationSummary
import com.example.hospitalinterpreter.model.GeminiVoice
import com.example.hospitalinterpreter.model.HighlightedEntity
import com.example.hospitalinterpreter.model.LanguageOption
import com.example.hospitalinterpreter.model.NurseAlert
import com.example.hospitalinterpreter.model.SessionState
import com.example.hospitalinterpreter.model.Speaker
import com.example.hospitalinterpreter.model.TranscriptMessage
import com.example.hospitalinterpreter.service.ClinicalEntityExtractor
import com.example.hospitalinterpreter.service.GeminiInterpreterService
import com.example.hospitalinterpreter.service.HistoryManager
import com.example.hospitalinterpreter.service.MedicalTutorialDetector
import com.example.hospitalinterpreter.ui.components.CareCompanionSheet
import com.example.hospitalinterpreter.ui.components.ConversationHistoryModal
import com.example.hospitalinterpreter.ui.components.ConversationSummaryModal
import com.example.hospitalinterpreter.ui.components.LanguageSelectorModal
import com.example.hospitalinterpreter.ui.components.LiveAnamnesisCard
import com.example.hospitalinterpreter.ui.components.MedicalTutorialDialog
import com.example.hospitalinterpreter.ui.components.OnboardingModal
import com.example.hospitalinterpreter.ui.components.SettingsModal
import com.example.hospitalinterpreter.ui.components.TranscriptCard
import com.example.hospitalinterpreter.ui.components.VoiceVisualizerOrb
import com.example.hospitalinterpreter.ui.theme.ClinicalGreen
import com.example.hospitalinterpreter.ui.theme.ClinicalTeal
import com.example.hospitalinterpreter.ui.theme.MedicalBlue
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun InterpreterScreen(
    onSpeakText: (String) -> Unit,
    onStartSpeechRecognition: (Speaker, LanguageOption) -> Unit,
    isDarkTheme: Boolean,
    onThemeToggle: (Boolean) -> Unit,
    apiKey: String = ""
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val historyManager = remember { HistoryManager(context) }

    // State Variables
    var selectedLanguage by remember { mutableStateOf(LanguageCatalog.defaultLanguage) }
    var currentSpeaker by remember { mutableStateOf(Speaker.NURSE) }
    var sessionState by remember { mutableStateOf(SessionState.IDLE) }
    var selectedVoice by remember { mutableStateOf(GeminiVoice.ZEPHYR) }

    val messages = remember { mutableStateListOf<TranscriptMessage>() }
    val nurseAlerts = remember { mutableStateListOf<NurseAlert>() }

    var textInput by remember { mutableStateOf("") }
    var selectedTab by remember { mutableStateOf(0) } // 0: Konuşma, 1: Anamnez, 2: Refakatçi

    // Modals
    var showLanguageModal by remember { mutableStateOf(false) }
    var showSummaryModal by remember { mutableStateOf(false) }
    var showHistoryModal by remember { mutableStateOf(false) }
    var showSettingsModal by remember { mutableStateOf(false) }
    var showOnboardingModal by remember { mutableStateOf(false) }
    var activeTutorialType by remember { mutableStateOf<String?>(null) }
    var selectedTermEntity by remember { mutableStateOf<HighlightedEntity?>(null) }
    var termExplanation by remember { mutableStateOf<Pair<String, String>?>(null) }
    var activeSummary by remember { mutableStateOf<ConversationSummary?>(null) }

    // Live Anamnesis derived from messages
    val realtimeAnamnesis by remember(messages.size) {
        derivedStateOf { ClinicalEntityExtractor.buildRealtimeAnamnesis(messages) }
    }

    val listState = rememberLazyListState()

    // Scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    // Process a new utterance
    fun processUtterance(rawText: String, speaker: Speaker) {
        if (rawText.isBlank()) return
        val cleanText = rawText.trim()

        sessionState = SessionState.INTERPRETING

        coroutineScope.launch {
            val translation = GeminiInterpreterService.translateUtterance(
                text = cleanText,
                speaker = speaker,
                targetLang = selectedLanguage,
                apiKey = apiKey
            )

            // Extract medical entities
            val combinedText = "$cleanText $translation"
            val entities = ClinicalEntityExtractor.extractEntities(combinedText)

            // Check medical tutorial intent
            val tutorialResult = MedicalTutorialDetector.detectTutorial(cleanText, translation)

            val newMsg = TranscriptMessage(
                id = UUID.randomUUID().toString(),
                speaker = speaker,
                originalText = cleanText,
                translatedText = translation,
                language = if (speaker == Speaker.NURSE) "Türkçe" else selectedLanguage.nameTr,
                highlightedEntities = entities,
                showTutorialVideo = tutorialResult.shouldShow,
                tutorialVideoType = tutorialResult.type,
                tutorialVideoTitle = tutorialResult.tutorial?.title
            )

            messages.add(newMsg)
            sessionState = SessionState.IDLE

            // Automatically speak translated text
            onSpeakText(translation)

            if (tutorialResult.shouldShow) {
                activeTutorialType = tutorialResult.type
            }
        }
    }

    // Archive current session
    fun archiveAndReset() {
        if (messages.isNotEmpty()) {
            val historyItem = ConversationHistoryItem(
                id = UUID.randomUUID().toString(),
                createdAt = System.currentTimeMillis(),
                targetLanguage = selectedLanguage,
                messages = messages.toList(),
                summary = activeSummary,
                previewText = messages.firstOrNull()?.originalText?.take(40) ?: "Görüşme",
                durationSeconds = 60
            )
            historyManager.saveConversation(historyItem)
            messages.clear()
            activeSummary = null
            Toast.makeText(context, "Görüşme geçmişe kaydedildi", Toast.LENGTH_SHORT).show()
        }
    }

    // UI Structure
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    // Language Selector Pill
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                        modifier = Modifier.clickable { showLanguageModal = true }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(selectedLanguage.flag, fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = selectedLanguage.nameTr,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("▼", fontSize = 10.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = {
                        coroutineScope.launch {
                            activeSummary = GeminiInterpreterService.generateSummary(messages, selectedLanguage, apiKey)
                            showSummaryModal = true
                        }
                    }) {
                        Icon(imageVector = Icons.Default.Assignment, contentDescription = "Görüşme Özeti", tint = MaterialTheme.colorScheme.primary)
                    }

                    IconButton(onClick = { showHistoryModal = true }) {
                        Icon(imageVector = Icons.Default.History, contentDescription = "Geçmiş", tint = MaterialTheme.colorScheme.onSurface)
                    }

                    IconButton(onClick = { showSettingsModal = true }) {
                        Icon(imageVector = Icons.Default.Settings, contentDescription = "Ayarlar", tint = MaterialTheme.colorScheme.onSurface)
                    }

                    IconButton(onClick = { showOnboardingModal = true }) {
                        Icon(imageVector = Icons.Default.Info, contentDescription = "Rehber", tint = MaterialTheme.colorScheme.onSurface)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            val isWide = maxWidth >= 768.dp

            if (isWide) {
                // Wide / Tablet Dual Side-by-Side View
                Row(modifier = Modifier.fillMaxSize()) {
                    // Left Column: Dialogue
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                    ) {
                        DialogueList(
                            messages = messages,
                            listState = listState,
                            onSpeakText = onSpeakText,
                            onEntityClick = { entity ->
                                selectedTermEntity = entity
                                coroutineScope.launch {
                                    termExplanation = GeminiInterpreterService.explainMedicalTerm(entity.text, apiKey)
                                }
                            },
                            onTutorialClick = { type -> activeTutorialType = type },
                            onQuickPrompt = { prompt, speaker -> processUtterance(prompt, speaker) },
                            modifier = Modifier.weight(1f)
                        )

                        InteractionBottomDeck(
                            currentSpeaker = currentSpeaker,
                            onSpeakerToggle = { currentSpeaker = it },
                            sessionState = sessionState,
                            onMicClick = {
                                if (sessionState == SessionState.LISTENING) {
                                    sessionState = SessionState.IDLE
                                } else {
                                    sessionState = SessionState.LISTENING
                                    onStartSpeechRecognition(currentSpeaker, selectedLanguage)
                                }
                            },
                            textInput = textInput,
                            onTextInputChange = { textInput = it },
                            onSendText = {
                                processUtterance(textInput, currentSpeaker)
                                textInput = ""
                            },
                            onClearClick = { archiveAndReset() }
                        )
                    }

                    // Right Column: Live Anamnesis
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
                    ) {
                        LiveAnamnesisCard(
                            anamnesis = realtimeAnamnesis,
                            onCopySummaryClick = { text ->
                                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                cm.setPrimaryClip(ClipData.newPlainText("Anamnez", text))
                                Toast.makeText(context, "Anamnez panoya kopyalandı", Toast.LENGTH_SHORT).show()
                            }
                        )
                    }
                }
            } else {
                // Phone Single View with Tab Switcher
                Column(modifier = Modifier.fillMaxSize()) {
                    TabRow(
                        selectedTabIndex = selectedTab,
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = MaterialTheme.colorScheme.primary
                    ) {
                        Tab(
                            selected = selectedTab == 0,
                            onClick = { selectedTab = 0 },
                            text = { Text("Canlı Konuşma", fontWeight = FontWeight.SemiBold) }
                        )
                        Tab(
                            selected = selectedTab == 1,
                            onClick = { selectedTab = 1 },
                            text = { Text("Anamnez Tablosu", fontWeight = FontWeight.SemiBold) }
                        )
                        Tab(
                            selected = selectedTab == 2,
                            onClick = { selectedTab = 2 },
                            text = { Text("Refakatçi (${nurseAlerts.size})", fontWeight = FontWeight.SemiBold) }
                        )
                    }

                    when (selectedTab) {
                        0 -> {
                            // Dialogue view
                            Column(modifier = Modifier.fillMaxSize()) {
                                DialogueList(
                                    messages = messages,
                                    listState = listState,
                                    onSpeakText = onSpeakText,
                                    onEntityClick = { entity ->
                                        selectedTermEntity = entity
                                        coroutineScope.launch {
                                            termExplanation = GeminiInterpreterService.explainMedicalTerm(entity.text, apiKey)
                                        }
                                    },
                                    onTutorialClick = { type -> activeTutorialType = type },
                                    onQuickPrompt = { prompt, speaker -> processUtterance(prompt, speaker) },
                                    modifier = Modifier.weight(1f)
                                )

                                InteractionBottomDeck(
                                    currentSpeaker = currentSpeaker,
                                    onSpeakerToggle = { currentSpeaker = it },
                                    sessionState = sessionState,
                                    onMicClick = {
                                        if (sessionState == SessionState.LISTENING) {
                                            sessionState = SessionState.IDLE
                                        } else {
                                            sessionState = SessionState.LISTENING
                                            onStartSpeechRecognition(currentSpeaker, selectedLanguage)
                                        }
                                    },
                                    textInput = textInput,
                                    onTextInputChange = { textInput = it },
                                    onSendText = {
                                        processUtterance(textInput, currentSpeaker)
                                        textInput = ""
                                    },
                                    onClearClick = { archiveAndReset() }
                                )
                            }
                        }
                        1 -> {
                            // Live Anamnesis view
                            LiveAnamnesisCard(
                                anamnesis = realtimeAnamnesis,
                                onCopySummaryClick = { text ->
                                    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    cm.setPrimaryClip(ClipData.newPlainText("Anamnez", text))
                                    Toast.makeText(context, "Anamnez panoya kopyalandı", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                        2 -> {
                            // Care companion and alert viewer
                            CareCompanionContent(
                                targetLanguage = selectedLanguage,
                                nurseAlerts = nurseAlerts,
                                onDispatchAlert = { alert -> nurseAlerts.add(0, alert) },
                                onDismissAlert = { id -> nurseAlerts.removeAll { it.id == id } }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modals
    if (showLanguageModal) {
        LanguageSelectorModal(
            selectedLanguage = selectedLanguage,
            onLanguageSelected = { selectedLanguage = it },
            onDismissRequest = { showLanguageModal = false }
        )
    }

    if (showSummaryModal) {
        ConversationSummaryModal(
            summary = activeSummary,
            onCopyClick = { text ->
                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("Görüşme Özeti", text))
                Toast.makeText(context, "Özet panoya kopyalandı", Toast.LENGTH_SHORT).show()
            },
            onShareClick = { text ->
                val shareIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, text)
                    type = "text/plain"
                }
                context.startActivity(Intent.createChooser(shareIntent, "Klinik Özeti Paylaş"))
            },
            onDismissRequest = { showSummaryModal = false }
        )
    }

    if (showHistoryModal) {
        ConversationHistoryModal(
            history = historyManager.getHistory(),
            onSelectConversation = { item ->
                messages.clear()
                messages.addAll(item.messages)
                selectedLanguage = item.targetLanguage
                activeSummary = item.summary
            },
            onDeleteConversation = { id -> historyManager.deleteConversation(id) },
            onClearAll = { historyManager.clearAll() },
            onDismissRequest = { showHistoryModal = false }
        )
    }

    if (showSettingsModal) {
        SettingsModal(
            selectedVoice = selectedVoice,
            onVoiceSelected = { selectedVoice = it },
            isDarkTheme = isDarkTheme,
            onThemeToggle = onThemeToggle,
            onDismissRequest = { showSettingsModal = false }
        )
    }

    if (showOnboardingModal) {
        OnboardingModal(onDismissRequest = { showOnboardingModal = false })
    }

    if (activeTutorialType != null) {
        MedicalTutorialDialog(
            tutorialType = activeTutorialType!!,
            onDismissRequest = { activeTutorialType = null }
        )
    }

    // Term Explainer Popover Dialog
    if (selectedTermEntity != null) {
        AlertDialog(
            onDismissRequest = {
                selectedTermEntity = null
                termExplanation = null
            },
            title = {
                Text(
                    text = "Tıbbi Terim: ${selectedTermEntity?.text}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = MedicalBlue
                )
            },
            text = {
                Column {
                    Text(
                        text = "Hasta Açıklaması (Sade Dil):",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = termExplanation?.first ?: "Açıklama yükleniyor...",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp, bottom = 10.dp)
                    )

                    Text(
                        text = "Klinik Tanım:",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = termExplanation?.second ?: "Klinik protokol detayı alınıyor...",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        selectedTermEntity = null
                        termExplanation = null
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MedicalBlue)
                ) {
                    Text("Tamam")
                }
            }
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DialogueList(
    messages: List<TranscriptMessage>,
    listState: androidx.compose.foundation.lazy.LazyListState,
    onSpeakText: (String) -> Unit,
    onEntityClick: (HighlightedEntity) -> Unit,
    onTutorialClick: (String) -> Unit,
    onQuickPrompt: (String, Speaker) -> Unit,
    modifier: Modifier = Modifier
) {
    if (messages.isEmpty()) {
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(20.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Surface(
                    shape = CircleShape,
                    color = MedicalBlue.copy(alpha = 0.1f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.LocalHospital,
                            contentDescription = null,
                            tint = MedicalBlue,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = "Yatak Başı Canlı Tercüman Hazır",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Aşağıdaki mikrofona basarak konuşun veya hızlı cümleleri seçin:",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                // Quick Bedside Prompts
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val quickPrompts = listOf(
                        Pair("Ağrınız var mı?", Speaker.NURSE),
                        Pair("Tansiyonunuzu ölçeceğim", Speaker.NURSE),
                        Pair("İlacınızı getirdim", Speaker.NURSE),
                        Pair("Hemşire çağrı butonunu kullanarak beni çağırabilirsiniz", Speaker.NURSE),
                        Pair("Triflow solunum egzersiz cihazını saatte bir yapmalısınız", Speaker.NURSE)
                    )

                    quickPrompts.forEach { (prompt, speaker) ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.clickable { onQuickPrompt(prompt, speaker) }
                        ) {
                            Text(
                                text = prompt,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                            )
                        }
                    }
                }
            }
        }
    } else {
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(16.dp),
            modifier = modifier.fillMaxSize()
        ) {
            items(messages, key = { it.id }) { msg ->
                TranscriptCard(
                    message = msg,
                    onSpeakClick = onSpeakText,
                    onEntityClick = onEntityClick,
                    onTutorialClick = onTutorialClick
                )
            }
        }
    }
}

@Composable
private fun InteractionBottomDeck(
    currentSpeaker: Speaker,
    onSpeakerToggle: (Speaker) -> Unit,
    sessionState: SessionState,
    onMicClick: () -> Unit,
    textInput: String,
    onTextInputChange: (String) -> Unit,
    onSendText: () -> Unit,
    onClearClick: () -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            // Speaker Mode Selector (Hemşire vs Hasta)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(3.dp)
                ) {
                    val nurseActive = currentSpeaker == Speaker.NURSE
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (nurseActive) MedicalBlue else Color.Transparent,
                        modifier = Modifier.clickable { onSpeakerToggle(Speaker.NURSE) }
                    ) {
                        Text(
                            text = "Hemşire (TR)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (nurseActive) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (!nurseActive) ClinicalTeal else Color.Transparent,
                        modifier = Modifier.clickable { onSpeakerToggle(Speaker.PATIENT) }
                    ) {
                        Text(
                            text = "Hasta (Yabancı)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (!nurseActive) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }
                }

                IconButton(onClick = onClearClick) {
                    Icon(
                        imageVector = Icons.Default.DeleteOutline,
                        contentDescription = "Temizle",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Central Voice Orb
            VoiceVisualizerOrb(
                sessionState = sessionState,
                onClick = onMicClick
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Text Input Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = textInput,
                    onValueChange = onTextInputChange,
                    placeholder = {
                        Text(
                            text = if (currentSpeaker == Speaker.NURSE) "Hemşire konuşması yazın..." else "Hasta konuşması yazın...",
                            fontSize = 13.sp
                        )
                    },
                    shape = RoundedCornerShape(20.dp),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = onSendText,
                    enabled = textInput.isNotBlank(),
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(if (textInput.isNotBlank()) MedicalBlue else MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Gönder",
                        tint = if (textInput.isNotBlank()) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CareCompanionContent(
    targetLanguage: LanguageOption,
    nurseAlerts: List<NurseAlert>,
    onDispatchAlert: (NurseAlert) -> Unit,
    onDismissAlert: (String) -> Unit
) {
    val quickRequests = listOf(
        Pair("Ağrım var (Şiddetli)", AlertPriority.HIGH),
        Pair("Su istiyorum", AlertPriority.NORMAL),
        Pair("Hemşire Çağır (Acil)", AlertPriority.URGENT),
        Pair("İlaç saatim ne zaman?", AlertPriority.NORMAL),
        Pair("Tuvalete gitmem gerekiyor", AlertPriority.HIGH)
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Yatak Başı Hasta İstekleri (${targetLanguage.nameTr})",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Hasta bu butonlara basarak hemşire bankosuna anında bildirim iletebilir.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            quickRequests.forEach { (text, priority) ->
                Button(
                    onClick = {
                        val alert = NurseAlert(
                            id = UUID.randomUUID().toString(),
                            title = text,
                            message = "Yatak başından '$text' talebi gönderildi.",
                            priority = priority
                        )
                        onDispatchAlert(alert)
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = when (priority) {
                            AlertPriority.URGENT -> Color(0xFFFFECEB)
                            AlertPriority.HIGH -> Color(0xFFFFF4E5)
                            AlertPriority.NORMAL -> MedicalBlue.copy(alpha = 0.1f)
                        },
                        contentColor = when (priority) {
                            AlertPriority.URGENT -> Color(0xFFFF3B30)
                            AlertPriority.HIGH -> Color(0xFFFF9500)
                            AlertPriority.NORMAL -> MedicalBlue
                        }
                    )
                ) {
                    Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "Aktif Bildirimler (${nurseAlerts.size})",
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp
        )

        LazyColumn(modifier = Modifier.weight(1f)) {
            items(nurseAlerts) { alert ->
                Card(
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                    ) {
                        Column {
                            Text(alert.title, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(alert.message, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Button(
                            onClick = { onDismissAlert(alert.id) },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = ClinicalGreen)
                        ) {
                            Text("Tamamlandı", fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}
