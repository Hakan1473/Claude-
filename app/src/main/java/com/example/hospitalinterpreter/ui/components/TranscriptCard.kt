package com.example.hospitalinterpreter.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.hospitalinterpreter.model.ClinicalEntityType
import com.example.hospitalinterpreter.model.HighlightedEntity
import com.example.hospitalinterpreter.model.Speaker
import com.example.hospitalinterpreter.model.TranscriptMessage
import com.example.hospitalinterpreter.ui.theme.ClinicalGreen
import com.example.hospitalinterpreter.ui.theme.ClinicalIndigo
import com.example.hospitalinterpreter.ui.theme.ClinicalOrange
import com.example.hospitalinterpreter.ui.theme.ClinicalRed
import com.example.hospitalinterpreter.ui.theme.ClinicalTeal
import com.example.hospitalinterpreter.ui.theme.MedicalBlue
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TranscriptCard(
    message: TranscriptMessage,
    onSpeakClick: (String) -> Unit,
    onEntityClick: (HighlightedEntity) -> Unit,
    onTutorialClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val isNurse = message.speaker == Speaker.NURSE
    val timeStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(message.timestamp))

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isNurse) {
                MedicalBlue.copy(alpha = 0.08f)
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp)
        ) {
            // Header Row: Speaker Badge + Timestamp + Audio action
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(if (isNurse) MedicalBlue else ClinicalTeal),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isNurse) Icons.Default.LocalHospital else Icons.Default.Person,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isNurse) "Hemşire (Türkçe)" else "Hasta (${message.language ?: "Yabancı Dil"})",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = if (isNurse) MedicalBlue else ClinicalTeal
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = timeStr,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(
                        onClick = {
                            val textToSpeak = message.translatedText ?: message.originalText
                            onSpeakClick(textToSpeak)
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.VolumeUp,
                            contentDescription = "Seslendir",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Original Text
            Text(
                text = message.originalText,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Translated Text
            if (!message.translatedText.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = message.translatedText,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }

            // Clinical Entities Tags
            if (message.highlightedEntities.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    message.highlightedEntities.forEach { entity ->
                        val (chipBg, chipFg) = when (entity.type) {
                            ClinicalEntityType.MEDICATION -> Pair(MedicalBlue.copy(alpha = 0.15f), MedicalBlue)
                            ClinicalEntityType.ALLERGY -> Pair(ClinicalRed.copy(alpha = 0.15f), ClinicalRed)
                            ClinicalEntityType.CHRONIC_DISEASE -> Pair(ClinicalOrange.copy(alpha = 0.15f), ClinicalOrange)
                            ClinicalEntityType.SURGERY -> Pair(ClinicalIndigo.copy(alpha = 0.15f), ClinicalIndigo)
                            ClinicalEntityType.VITAL_OR_METRIC -> Pair(ClinicalTeal.copy(alpha = 0.15f), ClinicalTeal)
                            ClinicalEntityType.DOSAGE -> Pair(ClinicalGreen.copy(alpha = 0.15f), ClinicalGreen)
                            else -> Pair(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.primary)
                        }

                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = chipBg,
                            modifier = Modifier.clickable { onEntityClick(entity) }
                        ) {
                            Text(
                                text = "${entity.labelTr}: ${entity.text}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = chipFg,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }
                }
            }

            // Medical Tutorial Banner Card if detected
            if (message.showTutorialVideo && !message.tutorialVideoType.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = ClinicalTeal.copy(alpha = 0.12f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onTutorialClick(message.tutorialVideoType) }
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.School,
                            contentDescription = null,
                            tint = ClinicalTeal,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = message.tutorialVideoTitle ?: "Tıbbi Kullanım Rehberi",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = ClinicalTeal
                            )
                            Text(
                                text = "Eğitim adımlarını ve hasta rehberini görüntüle",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Oynat",
                            tint = ClinicalTeal,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}
