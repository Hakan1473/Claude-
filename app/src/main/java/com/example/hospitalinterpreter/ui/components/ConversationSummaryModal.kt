package com.example.hospitalinterpreter.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.hospitalinterpreter.model.ConversationSummary
import com.example.hospitalinterpreter.ui.theme.ClinicalGreen
import com.example.hospitalinterpreter.ui.theme.ClinicalOrange
import com.example.hospitalinterpreter.ui.theme.ClinicalRed
import com.example.hospitalinterpreter.ui.theme.MedicalBlue
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConversationSummaryModal(
    summary: ConversationSummary?,
    onCopyClick: (String) -> Unit,
    onShareClick: (String) -> Unit,
    onDismissRequest: () -> Unit,
    sheetState: SheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .padding(horizontal = 16.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MedicalBlue.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Assignment,
                            contentDescription = null,
                            tint = MedicalBlue,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Klinik Görüşme Özeti",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Vardiya & Epikriz Handoff Raporu",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                IconButton(onClick = onDismissRequest) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "Kapat")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (summary == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Henüz klinik özet oluşturulmadı. Konuşma tamamlandığında otomatik hazırlanır.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                }
            } else {
                val scrollState = rememberScrollState()
                val formattedText = buildString {
                    appendLine("=== KLİNİK GÖRÜŞME ÖZETİ ===")
                    appendLine("Tarih: ${SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault()).format(Date(summary.timestamp))}")
                    appendLine("Hasta Dili: ${summary.targetLanguage}")
                    appendLine("\nÖZET: ${summary.briefSummaryTr}")
                    appendLine("\nŞİKAYETLER: " + summary.patientChiefComplaints.joinToString(", "))
                    appendLine("İSTEK VE İHTİYAÇLAR: " + summary.patientNeedsAndRequests.joinToString(", "))
                    appendLine("HEMŞİRELİK DİREKTİFLERİ: " + summary.clinicalInstructions.joinToString("; "))
                    appendLine("VİTALLER & İLAÇLAR: " + summary.vitalSignsAndDosages.joinToString(", "))
                    appendLine("\nYAPILACAKLAR:\n" + summary.actionItems.mapIndexed { idx, it -> "${idx + 1}. $it" }.joinToString("\n"))
                }

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(scrollState)
                ) {
                    // Brief Card
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MedicalBlue.copy(alpha = 0.08f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "Genel Değerlendirme",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = MedicalBlue
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = summary.briefSummaryTr,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Chief complaints
                    SummarySection(
                        title = "Tespit Edilen Şikayetler",
                        items = summary.patientChiefComplaints,
                        color = ClinicalRed
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Needs
                    SummarySection(
                        title = "Hasta İstek ve İhtiyaçları",
                        items = summary.patientNeedsAndRequests,
                        color = ClinicalOrange
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Instructions
                    SummarySection(
                        title = "Hemşirelik Bakım Direktifleri",
                        items = summary.clinicalInstructions,
                        color = ClinicalGreen
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Action items
                    SummarySection(
                        title = "Vardiya Takip Listesi (Action Items)",
                        items = summary.actionItems,
                        color = MedicalBlue
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                }

                // Action Buttons Row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp)
                ) {
                    OutlinedButton(
                        onClick = { onCopyClick(formattedText) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(imageVector = Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Metni Kopyala")
                    }

                    Button(
                        onClick = { onShareClick(formattedText) },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MedicalBlue),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(imageVector = Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Paylaş")
                    }
                }
            }
        }
    }
}

@Composable
private fun SummarySection(
    title: String,
    items: List<String>,
    color: Color
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                color = color
            )
            Spacer(modifier = Modifier.height(6.dp))
            items.forEach { item ->
                Row(modifier = Modifier.padding(vertical = 2.dp)) {
                    Text("• ", color = color, fontWeight = FontWeight.Bold)
                    Text(
                        text = item,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}
